
CREATE DATABASE IF NOT EXISTS bus_reservation;
USE bus_reservation;

-- Passengers table
CREATE TABLE IF NOT EXISTS passengers (
    passenger_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    phone VARCHAR(15) NOT NULL,
    password VARCHAR(255) NOT NULL
);

-- Buses table
CREATE TABLE IF NOT EXISTS buses (
    bus_id INT AUTO_INCREMENT PRIMARY KEY,
    bus_name VARCHAR(100) NOT NULL,
    source VARCHAR(100) NOT NULL,
    destination VARCHAR(100) NOT NULL,
    departure_time DATETIME NOT NULL,
    arrival_time DATETIME NOT NULL,
    total_seats INT NOT NULL,
    fare DECIMAL(10,2) NOT NULL
);

-- Bookings table
CREATE TABLE IF NOT EXISTS bookings (
    booking_id INT AUTO_INCREMENT PRIMARY KEY,
    passenger_id INT NOT NULL,
    bus_id INT NOT NULL,
    seats_booked INT NOT NULL,
    booking_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) DEFAULT 'CONFIRMED',
    FOREIGN KEY (passenger_id)
        REFERENCES passengers(passenger_id),
    FOREIGN KEY (bus_id)
        REFERENCES buses(bus_id)
);

-- Sample bus records
INSERT INTO buses
(bus_name, source, destination, departure_time,
 arrival_time, total_seats, fare)
SELECT 'Shivneri Express', 'Pune', 'Mumbai',
       '2026-10-15 07:00:00', '2026-10-15 11:00:00', 40, 450.00
WHERE NOT EXISTS (
    SELECT 1 FROM buses WHERE bus_name = 'Shivneri Express'
);

INSERT INTO buses
(bus_name, source, destination, departure_time,
 arrival_time, total_seats, fare)
SELECT 'Deccan Travels', 'Pune', 'Mumbai',
       '2026-10-15 09:00:00', '2026-10-15 13:30:00', 35, 600.00
WHERE NOT EXISTS (
    SELECT 1 FROM buses WHERE bus_name = 'Deccan Travels'
);

INSERT INTO buses
(bus_name, source, destination, departure_time,
 arrival_time, total_seats, fare)
SELECT 'Royal Express', 'Mumbai', 'Pune',
       '2026-10-15 14:00:00', '2026-10-15 18:30:00', 40, 500.00
WHERE NOT EXISTS (
    SELECT 1 FROM buses WHERE bus_name = 'Royal Express'
);

INSERT INTO buses
(bus_name, source, destination, departure_time,
 arrival_time, total_seats, fare)
SELECT 'Sai Travels', 'Pune', 'Nashik',
       '2026-10-15 08:00:00', '2026-10-15 12:00:00', 30, 350.00
WHERE NOT EXISTS (
    SELECT 1 FROM buses WHERE bus_name = 'Sai Travels'
);

INSERT INTO buses
(bus_name, source, destination, departure_time,
 arrival_time, total_seats, fare)
SELECT 'National Travels', 'Mumbai', 'Goa',
       '2026-10-15 21:00:00', '2026-10-16 08:00:00', 45, 1200.00
WHERE NOT EXISTS (
    SELECT 1 FROM buses WHERE bus_name = 'National Travels'
);

-- Verify database records
SELECT * FROM buses;
SHOW TABLES;
