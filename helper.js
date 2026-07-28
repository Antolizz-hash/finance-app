import { Timestamp } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-firestore.js";

export function toTimestamp(dateString) {
    return Timestamp.fromDate(new Date(dateString));
}