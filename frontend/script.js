
const API = "http://127.0.0.1:5000";

const busList = document.getElementById("busList");
const searchForm = document.getElementById("searchForm");
const showAllButton = document.getElementById("showAllBuses");

function createText(tag, text) {
    const element = document.createElement(tag);
    element.textContent = text;
    return element;
}

function displayBuses(buses) {
    busList.replaceChildren();

    if (buses.length === 0) {
        busList.textContent = "No buses found for your search.";
        return;
    }

    buses.forEach(bus => {
        const card = document.createElement("div");
        card.className = "bus-card";

        card.append(
            createText("h3", bus.bus_name),
            createText("p", `${bus.source} → ${bus.destination}`),
            createText(
                "p",
                `Departure: ${new Date(bus.departure_time).toLocaleString()}`
            ),
            createText(
                "p",
                `Arrival: ${new Date(bus.arrival_time).toLocaleString()}`
            ),
            createText("p", `Fare: ₹${bus.fare}`),
            createText("p", `Total seats: ${bus.total_seats}`)
        );

        const seats = createText(
            "p",
            `Available seats: ${bus.available_seats ?? bus.total_seats}`
        );
        seats.className = "available-seats";
        card.appendChild(seats);

        const form = document.createElement("form");
        form.className = "booking-form";

        const heading = createText("h4", "Book one seat");

        const name = document.createElement("input");
        name.type = "text";
        name.placeholder = "Passenger name";
        name.maxLength = 100;
        name.required = true;
        name.autocomplete = "name";

        const email = document.createElement("input");
        email.type = "email";
        email.placeholder = "Email address";
        email.maxLength = 100;
        email.required = true;
        email.autocomplete = "email";

        const phone = document.createElement("input");
        phone.type = "tel";
        phone.placeholder = "Phone number (7-15 digits)";
        phone.pattern = "[0-9]{7,15}";
        phone.maxLength = 15;
        phone.required = true;
        phone.autocomplete = "tel";

        const button = document.createElement("button");
        button.type = "submit";
        button.textContent = "Book Seat";

        const message = createText("p", "");
        message.setAttribute("role", "status");

        form.append(heading, name, email, phone, button, message);
        card.appendChild(form);
        busList.appendChild(card);

        if (Number(bus.available_seats ?? bus.total_seats) <= 0) {
            button.disabled = true;
            button.textContent = "Sold Out";
        }

        form.addEventListener("submit", async event => {
            event.preventDefault();

            button.disabled = true;
            button.textContent = "Booking...";
            message.textContent = "";

            try {
                const response = await fetch(`${API}/book`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        bus_id: bus.bus_id,
                        name: name.value.trim(),
                        email: email.value.trim(),
                        phone: phone.value.trim()
                    })
                });

                const result = await response.json();

                if (!response.ok || !result.success) {
                    message.textContent =
                        result.message || "Booking failed.";

                    button.textContent = "Book Seat";
                    await refreshBuses();
                    return;
                }

                seats.textContent =
                    `Available seats: ${result.available_seats}`;

                message.textContent =
                    `Booking successful! Your booking ID is ${result.booking_id}.`;

                name.value = "";
                email.value = "";
                phone.value = "";

                button.textContent =
                    result.available_seats <= 0 ? "Sold Out" : "Book Seat";

                button.disabled = result.available_seats <= 0;

            } catch (error) {
                console.error(error);
                message.textContent =
                    "Could not connect to the server. Check Flask and try again.";

                button.textContent = "Book Seat";
                button.disabled = false;
            }
        });
    });
}

async function loadBuses(url = `${API}/buses`) {
    busList.textContent = "Loading buses...";

    try {
        const response = await fetch(url);
        const buses = await response.json();

        if (!response.ok) {
            throw new Error(buses.error || "Could not load buses");
        }

        displayBuses(buses);

    } catch (error) {
        console.error(error);
        busList.textContent =
            "Cannot connect to the backend. Make sure Flask and MySQL are running.";
    }
}

async function refreshBuses() {
    const source = document.getElementById("source").value.trim();
    const destination =
        document.getElementById("destination").value.trim();
    const date = document.getElementById("travelDate").value;

    if (source && destination && date) {
        const params = new URLSearchParams({
            source,
            destination,
            date
        });

        await loadBuses(`${API}/search?${params.toString()}`);
    } else {
        await loadBuses();
    }
}

searchForm.addEventListener("submit", event => {
    event.preventDefault();

    const source = document.getElementById("source").value.trim();
    const destination =
        document.getElementById("destination").value.trim();
    const date = document.getElementById("travelDate").value;

    if (!source || !destination || !date) {
        return;
    }

    const params = new URLSearchParams({
        source,
        destination,
        date
    });

    loadBuses(`${API}/search?${params.toString()}`);
});

showAllButton.addEventListener("click", () => {
    searchForm.reset();
    loadBuses();
});

loadBuses();
