
const API = "http://127.0.0.1:5000";

const busList = document.getElementById("busList");
const searchForm = document.getElementById("searchForm");

async function loadBuses(url = `${API}/buses`) {
    busList.textContent = "Loading buses...";

    try {
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error("Could not load buses");
        }

        const buses = await response.json();

        busList.replaceChildren();

        if (buses.length === 0) {
            busList.textContent = "No buses found.";
            return;
        }

        buses.forEach(bus => {
            const card = document.createElement("div");
            card.className = "bus-card";

            const title = document.createElement("h3");
            title.textContent = bus.bus_name;

            const route = document.createElement("p");
            route.textContent = `${bus.source} → ${bus.destination}`;

            const departure = document.createElement("p");
            departure.textContent =
                `Departure: ${new Date(bus.departure_time).toLocaleString()}`;

            const arrival = document.createElement("p");
            arrival.textContent =
                `Arrival: ${new Date(bus.arrival_time).toLocaleString()}`;

            const seats = document.createElement("p");
            seats.textContent = `Total seats: ${bus.total_seats}`;

            const fare = document.createElement("p");
            fare.textContent = `Fare: ₹${bus.fare}`;

            card.append(title, route, departure, arrival, seats, fare);
            busList.appendChild(card);
        });

    } catch (error) {
        busList.textContent =
            "Cannot connect to the backend. Make sure Flask is running.";
    }
}

searchForm.addEventListener("submit", function (event) {
    event.preventDefault();

    const source = document.getElementById("source").value.trim();
    const destination =
        document.getElementById("destination").value.trim();

    const url = `${API}/search?source=${encodeURIComponent(source)}&destination=${encodeURIComponent(destination)}`;

    loadBuses(url);
});

loadBuses();

