
const API_URL = "http://127.0.0.1:5000";

const searchForm = document.getElementById("searchForm");
const busList = document.getElementById("busList");
const showAllBuses = document.getElementById("showAllBuses");

let buses = [];

// Load all buses
async function loadBuses() {
    busList.innerHTML = "<p>Loading buses...</p>";

    try {
        const response = await fetch(`${API_URL}/buses`);
        if (!response.ok) throw new Error("Could not load buses");

        buses = await response.json();
        displayBuses(buses);
    } catch (error) {
        busList.innerHTML =
            "<p>Cannot connect to the server. Start MySQL and Flask first.</p>";
    }
}

// Search buses
if (searchForm) {
    searchForm.addEventListener("submit", async function (event) {
        event.preventDefault();

        const source = document.getElementById("source").value.trim();
        const destination =
            document.getElementById("destination").value.trim();
        const date = document.getElementById("travelDate").value;

        if (!source || !destination || !date) {
            alert("Please enter source, destination and journey date.");
            return;
        }

        busList.innerHTML = "<p>Searching buses...</p>";

        try {
            const params = new URLSearchParams({
                source,
                destination,
                date
            });

            const response = await fetch(
                `${API_URL}/search?${params.toString()}`
            );

            const results = await response.json();

            if (!response.ok) {
                throw new Error(results.error || "Search failed");
            }

            buses = results;
            displayBuses(buses);
        } catch (error) {
            busList.innerHTML = `<p>${escapeHTML(error.message)}</p>`;
        }
    });
}

// Show all buses button
if (showAllBuses) {
    showAllBuses.addEventListener("click", loadBuses);
}

// Display bus cards
function displayBuses(busArray) {
    busList.innerHTML = "";

    if (!busArray.length) {
        busList.innerHTML = "<p>No buses found.</p>";
        return;
    }

    busArray.forEach(bus => {
        const card = document.createElement("div");
        card.className = "bus-card";

        card.innerHTML = `
            <h3>${escapeHTML(bus.bus_name)}</h3>
            <p><strong>Route:</strong>
                ${escapeHTML(bus.source)} → ${escapeHTML(bus.destination)}
            </p>
            <p><strong>Departure:</strong>
                ${escapeHTML(formatDate(bus.departure_time))}
            </p>
            <p><strong>Arrival:</strong>
                ${escapeHTML(formatDate(bus.arrival_time))}
            </p>
            <p><strong>Fare:</strong> ₹${Number(bus.fare).toFixed(2)}</p>
            <p><strong>Available seats:</strong>
                <span id="available-${bus.bus_id}">
                    ${Number(bus.available_seats)}
                </span>
            </p>
            <button type="button" class="seat-toggle">
                Select Seat
            </button>
            <div class="seat-area" hidden></div>
        `;

        busList.appendChild(card);

        card.querySelector(".seat-toggle").addEventListener(
            "click",
            () => openSeatSelection(bus, card)
        );
    });
}

// Load and display seats for a bus
async function openSeatSelection(bus, card) {
    const seatArea = card.querySelector(".seat-area");
    const toggleButton = card.querySelector(".seat-toggle");

    if (!seatArea.hidden) {
        seatArea.hidden = true;
        toggleButton.textContent = "Select Seat";
        return;
    }

    seatArea.hidden = false;
    toggleButton.textContent = "Hide Seats";
    seatArea.innerHTML = "<p>Loading seats...</p>";

    try {
        const response = await fetch(
            `${API_URL}/seats/${bus.bus_id}`
        );
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || "Could not load seats");
        }

        renderSeats(bus, card, data);
    } catch (error) {
        seatArea.innerHTML = `<p>${escapeHTML(error.message)}</p>`;
    }
}

// Render the seat map and passenger form
function renderSeats(bus, card, data) {
    const seatArea = card.querySelector(".seat-area");
    const bookedSeats = new Set(data.booked_seats.map(Number));
    const totalSeats = Number(data.total_seats);

    let selectedSeat = null;

    seatArea.innerHTML = `
        <h4>Select your seat</h4>

        <div class="seat-legend">
            <span class="legend-available">Available</span>
            <span class="legend-selected">Selected</span>
            <span class="legend-booked">Booked</span>
        </div>

        <div class="seat-map">
            <div class="driver-label">FRONT / DRIVER</div>
            <div class="seat-grid"></div>
        </div>

        <p class="selected-seat">
            Selected seat: <strong>None</strong>
        </p>

        <form class="booking-form">
            <label>
                Full name
                <input name="name" type="text" maxlength="100" required>
            </label>

            <label>
                Email
                <input name="email" type="email" maxlength="100" required>
            </label>

            <label>
                Phone
                <input name="phone" type="tel"
                    maxlength="15" pattern="[0-9]{7,15}" required>
            </label>

            <button type="submit" disabled>Confirm Booking</button>
            <p class="booking-message" aria-live="polite"></p>
        </form>
    `;

    const grid = seatArea.querySelector(".seat-grid");
    const selectedLabel = seatArea.querySelector(".selected-seat strong");
    const bookingForm = seatArea.querySelector(".booking-form");
    const submitButton = bookingForm.querySelector("button");
    const message = bookingForm.querySelector(".booking-message");

    // Four seats per row, with an aisle between columns 2 and 3
    for (let seat = 1; seat <= totalSeats; seat++) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "seat";
        button.textContent = seat;
        button.setAttribute("aria-label", `Seat ${seat}`);

        if (bookedSeats.has(seat)) {
            button.classList.add("booked");
            button.disabled = true;
            button.title = "Already booked";
        } else {
            button.classList.add("available");

            button.addEventListener("click", () => {
                grid.querySelectorAll(".seat.selected").forEach(item => {
                    item.classList.remove("selected");
                    item.classList.add("available");
                });

                button.classList.remove("available");
                button.classList.add("selected");

                selectedSeat = seat;
                selectedLabel.textContent = seat;
                submitButton.disabled = false;
                message.textContent = "";
            });
        }

        // Create a visible aisle after every two seats
        if ((seat - 1) % 4 >= 2) {
            button.style.marginLeft = "16px";
        }

        grid.appendChild(button);
    }

    // Submit booking with the selected seat number
    bookingForm.addEventListener("submit", async event => {
        event.preventDefault();

        if (selectedSeat === null) {
            message.textContent = "Please select a seat first.";
            return;
        }

        const formData = new FormData(bookingForm);
        const payload = {
            name: formData.get("name").trim(),
            email: formData.get("email").trim(),
            phone: formData.get("phone").trim(),
            bus_id: Number(bus.bus_id),
            seat_number: selectedSeat
        };

        submitButton.disabled = true;
        message.textContent = "Processing booking...";

        try {
            const response = await fetch(`${API_URL}/book`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(payload)
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || "Booking failed");
            }

            message.textContent =
                `Booking successful! Booking ID: ${result.booking_id}. ` +
                `Your seat: ${result.seat_number}.`;

            // Refresh the seat map from the database
            const seatsResponse = await fetch(
                `${API_URL}/seats/${bus.bus_id}`
            );
            const latestSeats = await seatsResponse.json();

            if (seatsResponse.ok) {
                renderSeats(bus, card, latestSeats);
            }

            // Refresh displayed seat count
            const countResponse = await fetch(
                `${API_URL}/buses`
            );

            if (countResponse.ok) {
                const latestBuses = await countResponse.json();
                const latestBus = latestBuses.find(
                    item => Number(item.bus_id) === Number(bus.bus_id)
                );

                if (latestBus) {
                    bus.available_seats = latestBus.available_seats;
                    const countElement = document.getElementById(
                        `available-${bus.bus_id}`
                    );

                    if (countElement) {
                        countElement.textContent = latestBus.available_seats;
                    }
                }
            }
        } catch (error) {
            message.textContent = error.message;
            submitButton.disabled = false;
        }
    });
}

// Format date and time
function formatDate(value) {
    if (!value) return "Not available";

    const date = new Date(value);
    return Number.isNaN(date.getTime())
        ? String(value)
        : date.toLocaleString();
}

// Escape database text before displaying it as HTML
function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, character => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[character]);
}

// Load buses when the page opens
loadBuses();
