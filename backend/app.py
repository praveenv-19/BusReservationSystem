
from flask import Flask, request, jsonify
from flask_cors import CORS
from db import get_connection
from datetime import datetime

app = Flask(__name__)
CORS(app)


@app.route("/")
def home():
    return "Bus Reservation System Backend is Running!"


# Display all buses
@app.route("/buses", methods=["GET"])
def get_buses():
    connection = None
    cursor = None

    try:
        connection = get_connection()
        cursor = connection.cursor(dictionary=True)

        cursor.execute("""
            SELECT *
            FROM buses
            ORDER BY departure_time
        """)

        return jsonify(cursor.fetchall())

    except Exception as error:
        print("Error fetching buses:", error)
        return jsonify({"error": "Could not fetch buses"}), 500

    finally:
        if cursor:
            cursor.close()
        if connection:
            connection.close()


# Search buses by route and journey date
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
        return jsonify({"error": "Invalid journey date"}), 400

    connection = None
    cursor = None

    try:
        connection = get_connection()
        cursor = connection.cursor(dictionary=True)

        cursor.execute("""
            SELECT *
            FROM buses
            WHERE LOWER(source) = LOWER(%s)
              AND LOWER(destination) = LOWER(%s)
              AND DATE(departure_time) = %s
            ORDER BY departure_time
        """, (source, destination, travel_date))

        return jsonify(cursor.fetchall())

    except Exception as error:
        print("Search error:", error)
        return jsonify({"error": "Could not search buses"}), 500

    finally:
        if cursor:
            cursor.close()
        if connection:
            connection.close()


# Book one seat
@app.route("/book", methods=["POST"])
def book_seat():
    data = request.get_json(silent=True) or {}

    name = str(data.get("name", "")).strip()
    email = str(data.get("email", "")).strip().lower()
    phone = str(data.get("phone", "")).strip()
    bus_id = data.get("bus_id")

    if not name or not email or not phone or bus_id is None:
        return jsonify({
            "success": False,
            "message": "Name, email, phone and bus are required."
        }), 400

    if len(name) > 100 or len(email) > 100:
        return jsonify({
            "success": False,
            "message": "Name or email is too long."
        }), 400

    if "@" not in email or "." not in email.split("@")[-1]:
        return jsonify({
            "success": False,
            "message": "Enter a valid email address."
        }), 400

    if not phone.isdigit() or not 7 <= len(phone) <= 15:
        return jsonify({
            "success": False,
            "message": "Phone must contain 7 to 15 digits."
        }), 400

    try:
        bus_id = int(bus_id)
        if bus_id <= 0:
            raise ValueError()
    except (ValueError, TypeError):
        return jsonify({
            "success": False,
            "message": "Invalid bus ID."
        }), 400

    connection = None
    cursor = None

    try:
        connection = get_connection()
        connection.start_transaction()
        cursor = connection.cursor(dictionary=True)

        # Reserve a seat only if one is available.
        cursor.execute("""
            UPDATE buses
            SET available_seats = available_seats - 1
            WHERE bus_id = %s
              AND available_seats > 0
        """, (bus_id,))

        if cursor.rowcount != 1:
            connection.rollback()
            return jsonify({
                "success": False,
                "message": "No seats available for this bus."
            }), 409

        # Find an existing passenger by email.
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

        # Record the confirmed booking.
        cursor.execute("""
            INSERT INTO bookings
                (passenger_id, bus_id, seats_booked, status)
            VALUES (%s, %s, 1, 'CONFIRMED')
        """, (passenger_id, bus_id))

        booking_id = cursor.lastrowid

        cursor.execute("""
            SELECT available_seats
            FROM buses
            WHERE bus_id = %s
        """, (bus_id,))

        available_seats = cursor.fetchone()["available_seats"]

        connection.commit()

        return jsonify({
            "success": True,
            "message": "Seat booked successfully!",
            "booking_id": booking_id,
            "available_seats": available_seats
        }), 201

    except Exception as error:
        if connection:
            connection.rollback()

        print("Booking error:", error)

        return jsonify({
            "success": False,
            "message": "Booking failed. Please try again."
        }), 500

    finally:
        if cursor:
            cursor.close()
        if connection:
            connection.close()


if __name__ == "__main__":
    app.run(debug=True)
