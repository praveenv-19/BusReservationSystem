
import mysql.connector

def get_connection():
    connection = mysql.connector.connect(
        host="localhost",
        user="root",
        password="",  # Change this if you set a root password
        database="bus_reservation",
        port=3306
    )
    return connection

