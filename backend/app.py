
from flask import Flask, jsonify, request
from flask_cors import CORS
from db import get_connection

app = Flask(__name__)
CORS(app)


@app.route("/")
def home():
    return "Bus Reservation System Backend is Running!"


@app.route("/buses", methods=["GET"])
def get_buses():
    connection = get_connection()
    cursor = connection.cursor(dictionary=True)

    cursor.execute("SELECT * FROM buses")
    buses = cursor.fetchall()

    cursor.close()
    connection.close()

    return jsonify(buses)


@app.route("/search", methods=["GET"])
def search_buses():
    source = request.args.get("source", "")
    destination = request.args.get("destination", "")

    connection = get_connection()
    cursor = connection.cursor(dictionary=True)

    cursor.execute(
        """
        SELECT * FROM buses
        WHERE LOWER(source) = LOWER(%s)
        AND LOWER(destination) = LOWER(%s)
        """,
        (source, destination)
    )

    buses = cursor.fetchall()

    cursor.close()
    connection.close()

    return jsonify(buses)


if __name__ == "__main__":
    app.run(debug=True)

