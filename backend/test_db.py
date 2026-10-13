
from db import get_connection

try:
    connection = get_connection()

    if connection.is_connected():
        print("MySQL connected successfully!")

    cursor = connection.cursor()
    cursor.execute("SELECT bus_id, bus_name, source, destination FROM buses")

    for bus in cursor.fetchall():
        print(bus)

    cursor.close()
    connection.close()

except Exception as error:
    print("Database connection failed:", error)
