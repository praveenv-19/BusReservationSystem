
from flask import Flask, request, jsonify
from flask_cors import CORS
from db import get_connection
from datetime import datetime

app = Flask(__name__)
CORS(app)


# Home
@app.route("/", methods=["GET"])
def home():
    return "Bus Reservation System Backend is Running!"


# Display all buses
@app.route("/buses", methods=["GET"])
def get_buses():
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        cursor.execute("""
            SELECT *
            FROM buses
            ORDER BY departure_time
        """)
        buses = cursor.fetchall()

        for bus in buses:
            for key, value in bus.items():
                if isinstance(value, datetime):
                    bus[key] = value.isoformat()

        return jsonify(buses)

    finally:
        cursor.close()
        conn.close()


# Search buses by source, destination and date
@app.route("/search", methods=["GET"])
def search_buses():
    source = request.args.get("source", "").strip()
    destination = request.args.get("destination", "").strip()
    travel_date = request.args.get("date", "").strip()

    if not source or not destination or not travel_date:
        return jsonify({
            "error": "Source, destination and date are required"
        }), 400

    try:
        datetime.strptime(travel_date, "%Y-%m-%d")
    except ValueError:
        return jsonify({"error": "Invalid date format"}), 400

    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        cursor.execute("""
            SELECT *
            FROM buses
            WHERE LOWER(source) = LOWER(%s)
              AND LOWER(destination) = LOWER(%s)
              AND DATE(departure_time) = %s
            ORDER BY departure_time
        """, (source, destination, travel_date))

        buses = cursor.fetchall()

        for bus in buses:
            for key, value in bus.items():
                if isinstance(value, datetime):
                    bus[key] = value.isoformat()

        return jsonify(buses)

    finally:
        cursor.close()
        conn.close()


# Get booked seats for a particular bus
@app.route("/seats/<int:bus_id>", methods=["GET"])
def get_seats(bus_id):
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        cursor.execute("""
            SELECT total_seats
            FROM buses
            WHERE bus_id = %s
        """, (bus_id,))

        bus = cursor.fetchone()

        if not bus:
            return jsonify({"error": "Bus not found"}), 404

        cursor.execute("""
            SELECT seat_number
            FROM bookings
            WHERE bus_id = %s
              AND status = 'CONFIRMED'
              AND seat_number IS NOT NULL
        """, (bus_id,))

        booked_seats = [
            row["seat_number"] for row in cursor.fetchall()
        ]

        return jsonify({
            "bus_id": bus_id,
            "total_seats": bus["total_seats"],
            "booked_seats": booked_seats
        })

    finally:
        cursor.close()
        conn.close()


# Book a selected seat
@app.route("/book", methods=["POST"])
def book_bus():
    data = request.get_json(silent=True) or {}

    name = str(data.get("name", "")).strip()
    email = str(data.get("email", "")).strip().lower()
    phone = str(data.get("phone", "")).strip()
    bus_id = data.get("bus_id")
    seat_number = data.get("seat_number")

    if not name or not email or not phone:
        return jsonify({
            "error": "Name, email and phone are required"
        }), 400

    if len(name) > 100 or len(email) > 100 or len(phone) > 15:
        return jsonify({"error": "One or more fields are too long"}), 400

    if "@" not in email or "." not in email.rsplit("@", 1)[-1]:
        return jsonify({"error": "Enter a valid email address"}), 400

    if not phone.isdigit() or len(phone) < 7:
        return jsonify({"error": "Enter a valid phone number"}), 400

    # Reject invalid IDs rather than accepting booleans or strings.
    if type(bus_id) is not int or bus_id <= 0:
        return jsonify({"error": "Invalid bus ID"}), 400

    if type(seat_number) is not int or seat_number <= 0:
        return jsonify({"error": "Select a valid seat"}), 400

    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        conn.start_transaction()

        # Lock the bus row so concurrent bookings cannot overbook it.
        cursor.execute("""
            SELECT total_seats, available_seats
            FROM buses
            WHERE bus_id = %s
            FOR UPDATE
        """, (bus_id,))

        bus = cursor.fetchone()

        if not bus:
            conn.rollback()
            return jsonify({"error": "Bus not found"}), 404

        if seat_number > bus["total_seats"]:
            conn.rollback()
            return jsonify({"error": "Invalid seat number"}), 400

        # Check whether the selected seat is already confirmed.
        cursor.execute("""
            SELECT booking_id
            FROM bookings
            WHERE bus_id = %s
              AND seat_number = %s
              AND status = 'CONFIRMED'
            FOR UPDATE
        """, (bus_id, seat_number))

        if cursor.fetchone():
            conn.rollback()
            return jsonify({
                "error": "This seat is already booked. Please select another seat."
            }), 409

        if bus["available_seats"] <= 0:
            conn.rollback()
            return jsonify({"error": "This bus is sold out"}), 409

        # Find or create the passenger using their email.
        cursor.execute("""
            SELECT passenger_id
            FROM passengers
            WHERE email = %s
            FOR UPDATE
        """, (email,))

        passenger = cursor.fetchone()

        if passenger:
            passenger_id = passenger["passenger_id"]

            cursor.execute("""
                UPDATE passengers
                SET name = %s, phone = %s
                WHERE passenger_id = %s
            """, (name, phone, passenger_id))

        else:
            cursor.execute("""
                INSERT INTO passengers (name, email, phone, password)
                VALUES (%s, %s, %s, NULL)
            """, (name, email, phone))

            passenger_id = cursor.lastrowid

        # Insert the booking with the selected seat.
        cursor.execute("""
            INSERT INTO bookings
                (passenger_id, bus_id, seats_booked,
                 seat_number, status)
            VALUES (%s, %s, 1, %s, 'CONFIRMED')
        """, (passenger_id, bus_id, seat_number))

        booking_id = cursor.lastrowid

        # Decrease available seats only after successful booking insertion.
        cursor.execute("""
            UPDATE buses
            SET available_seats = available_seats - 1
            WHERE bus_id = %s
              AND available_seats > 0
        """, (bus_id,))

        if cursor.rowcount != 1:
            conn.rollback()
            return jsonify({"error": "No seats available"}), 409

        conn.commit()

        return jsonify({
            "message": "Bus booked successfully!",
            "booking_id": booking_id,
            "bus_id": bus_id,
            "seat_number": seat_number,
            "passenger_id": passenger_id,
            "remaining_seats": bus["available_seats"] - 1
        }), 201

    except Exception as error:
        conn.rollback()

        # The unique index also protects against duplicate seat assignments.
        if getattr(error, "errno", None) == 1062:
            return jsonify({
                "error": "This seat is already booked. Please select another seat."
            }), 409

        app.logger.exception("Booking failed")
        return jsonify({"error": "Booking failed due to a server error"}), 500

    finally:
        cursor.close()
        conn.close()


if __name__ == "__main__":
    app.run(debug=True)
