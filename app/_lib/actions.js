"use server";

import { revalidatePath } from "next/cache";
import { auth, signIn, signOut } from "./auth";
import {
	createBooking,
	deleteBooking,
	getBookings,
	updateBooking,
	updateGuest,
} from "./data-service";
import { redirect } from "next/navigation";

export async function createReservation(bookingData, formData) {
	const session = await auth();
	if (!session) throw new Error("You must be signed in to update your profile");

	const newBooking = {
		...bookingData,
		guestId: session.user.guestId,
		numGuests: Number(formData.get("numGuests")),
		observations: formData.get("observations").slice(0, 500),
		extrasPrice: 0,
		totalPrice: bookingData.cabinPrice,
		isPaid: false,
		hasBreakfast: false,
		status: "unconfirmed",
	};

	createBooking(newBooking);

	revalidatePath(`/account/cabins/${bookingData.cabinId}`);

	redirect("/cabins/thankyou");
}

export async function updateProfile(formData) {
	const session = await auth();
	if (!session) throw new Error("You must be signed in to update your profile");

	const nationalID = formData.get("nationalID");
	const [nationality, countryFlag] = formData.get("nationality").split("%");

	if (!/^[a-zA-Z0-9]{6,12}$/.test(nationalID))
		throw new Error("Invalid national ID number");

	const updateData = { nationality, nationalID, countryFlag };

	updateGuest(session.user.guestId, updateData);

	revalidatePath("/account/profile");
}

export async function deleteReservation(bookingId) {
	const session = await auth();
	if (!session) throw new Error("You must be signed in to update your profile");

	const guestBookings = await getBookings(session.user.guestId);
	const guestBookingsIds = guestBookings.map((booking) => booking.id);

	if (!guestBookingsIds.includes(bookingId))
		throw new Error("You are not allowed to delete this booking");

	deleteBooking(bookingId);

	revalidatePath("/account/reservations");
}

export async function updateReservation(formData) {
	const bookingId = Number(formData.get("bookingId"));

	const session = await auth();
	if (!session) throw new Error("You must be signed in to update your booking");

	const guestBookings = await getBookings(session.user.guestId);
	const guestBookingsIds = guestBookings.map((booking) => booking.id);

	if (!guestBookingsIds.includes(bookingId))
		throw new Error("You are not allowed to update this booking");

	const updateData = {
		numGuests: formData.get("numGuests"),
		observations: formData.get("observations").slice(0, 500),
	};

	updateBooking(bookingId, updateData);

	revalidatePath("/account/reservations");
	revalidatePath(`/account/reservations/edit/${bookingId}`);

	redirect("/account/reservations");
}

export async function signInAction() {
	await signIn("google", {
		redirectTo: "/account",
	});
}

export async function signOutAction() {
	await signOut({ redirectTo: "/" });
}
