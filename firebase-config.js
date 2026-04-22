// ===== REAL FIREBASE SETUP =====
// Yeh file sirf Firebase ko initialize karti hai
// API keys ismein hain lekin production mein backend proxy use karna chahiye

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, query, orderBy, doc, deleteDoc, updateDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Firebase Config - Yeh aapke project ki details hain
const firebaseConfig = {
    apiKey: "AIzaSyC203H8isoltOx66YZ_wddqpWB4nBIMQZU",
    authDomain: "streamer-a5ea9.firebaseapp.com",
    projectId: "streamer-a5ea9",
    storageBucket: "streamer-a5ea9.appspot.com",
    messagingSenderId: "821781298641",
    appId: "1:821781298641:web:1fcec50709460dcdd8f4f0"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// ===== FIREBASE API FUNCTIONS =====
// Yeh functions sab jagah use honge - app.js mein bhi

const FirebaseAPI = {
    // MOVIES COLLECTION
    async saveMovie(movieData) {
        try {
            const docRef = await addDoc(collection(db, "movies"), movieData);
            return { success: true, id: docRef.id };
        } catch (error) {
            console.error("Firebase save error:", error);
            throw error;
        }
    },

    async getMovies() {
        try {
            const q = query(collection(db, "movies"), orderBy("timestamp", "desc"));
            const snapshot = await getDocs(q);
            return snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
        } catch (error) {
            console.error("Firebase get error:", error);
            throw error;
        }
    },

    async updateViews(movieId) {
        try {
            const movieRef = doc(db, "movies", movieId);
            const movieSnap = await getDoc(movieRef);
            if (movieSnap.exists()) {
                const currentViews = movieSnap.data().views || 0;
                await updateDoc(movieRef, { views: currentViews + 1 });
            }
        } catch (error) {
            console.error("Firebase update error:", error);
        }
    },

    async deleteMovie(movieId) {
        try {
            await deleteDoc(doc(db, "movies", movieId));
            return { success: true };
        } catch (error) {
            console.error("Firebase delete error:", error);
            throw error;
        }
    },

    // ADMIN VERIFICATION (Firestore mein admin collection)
    async verifyAdmin(password) {
        try {
            // Simple check - production mein backend se karna chahiye
            return { valid: password === 'Sumit.streamer@81#live.ott' };
        } catch (error) {
            console.error("Admin verify error:", error);
            return { valid: false };
        }
    }
};

// Export globally
window.db = db;
window.FirebaseAPI = FirebaseAPI;
