import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getMessaging } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging.js";

const firebaseConfig = {
  apiKey: "AIzaSyAqwvfNgFCKno8IYSmOQHual4Ks7tWIO1c",
  authDomain: "cia-da-beleza-beb00.firebaseapp.com",
  projectId: "cia-da-beleza-beb00",
  storageBucket: "cia-da-beleza-beb00.firebasestorage.app",
  messagingSenderId: "567844800760",
  appId: "1:567844800760:web:8f16e64daa0315a9ae130d"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const messaging = getMessaging(app);

// Re-export Firebase functions for easier imports
export {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  updateProfile
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

export {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  addDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  Timestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

export {
  getToken,
  onMessage
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging.js";

// Helper functions
export async function getUserRole(uid, email = null) {
  try {
    // 1. Tentar buscar pelo UID (padrão Firebase Auth)
    let userDoc = await getDoc(doc(db, "users", uid));

    // 2. Se não encontrar e tiver email, tentar buscar pelo ID antigo (email formatado)
    if (!userDoc.exists() && email) {
      console.log('Usuário não encontrado pelo UID, tentando busca por email antigo:', email);
      const legacyId = email.replace(/[@.]/g, '_');
      userDoc = await getDoc(doc(db, "users", legacyId));
    }

    if (userDoc.exists()) {
      const data = userDoc.data();
      console.log('Função encontrada:', data.role);
      return data.role || 'funcionario';
    }

    console.warn('Usuário não encontrado na coleção users:', uid);
    return 'funcionario';
  } catch (error) {
    console.error('Error getting user role:', error);
    return 'funcionario';
  }
}

export async function isAdmin(uid) {
  const role = await getUserRole(uid);
  return role === 'admin';
}

export async function createUserWithProfile(email, password, nome, role = 'funcionario') {
  try {
    const { createUserWithEmailAndPassword, updateProfile } = await import(
      "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js"
    );
    const { setDoc } = await import(
      "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js"
    );

    // Create user in Authentication
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Update profile with name
    await updateProfile(user, { displayName: nome });

    // Create document in Firestore with role
    await setDoc(doc(db, "users", user.uid), {
      nome: nome,
      email: email,
      role: role,
      criadoEm: new Date(),
      ativo: true
    });

    return user;
  } catch (error) {
    console.error("Error creating user:", error);
    throw error;
  }
}

// Notification helper
export async function initializeNotifications(userId) {
  try {
    const permission = await Notification.requestPermission();

    if (permission === 'granted') {
      const token = await getToken(messaging, {
        vapidKey: 'SUA_VAPID_KEY_AQUI' // Você precisa gerar no Firebase Console
      });

      if (token) {
        // Save token to Firestore
        await setDoc(doc(db, "userTokens", userId), {
          token,
          userId,
          email: auth.currentUser?.email,
          createdAt: new Date(),
          updatedAt: new Date()
        }, { merge: true });

        console.log('Token salvo:', token);
        return token;
      }
    }
  } catch (error) {
    console.error('Erro ao inicializar notificações:', error);
  }
  return null;
}

// Helper to create professional without logging out the admin
export async function createProfessional(email, password, nome, especialidade) {
  try {
    const { initializeApp: initApp } = await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js");
    const { getAuth: getAuthInstance, createUserWithEmailAndPassword: createUser } = await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js");
    const { setDoc, doc: docRef } = await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js");

    // Initialize a secondary app instance
    const secondaryApp = initApp(firebaseConfig, "SecondaryApp");
    const secondaryAuth = getAuthInstance(secondaryApp);

    // Create user in secondary auth (does not affect main auth)
    const userCredential = await createUser(secondaryAuth, email, password);
    const user = userCredential.user;

    // IMPORTANT: Update Auth Profile so displayName is available immediately
    try {
      const { updateProfile } = await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js");
      await updateProfile(user, { displayName: nome });
    } catch (e) {
      console.warn("Could not update auth profile displayName:", e);
    }

    // Save to Firestore using main db instance
    await setDoc(docRef(db, "users", user.uid), {
      nome,
      email,
      role: 'profissional',
      especialidade,
      criadoEm: new Date(),
      ativo: true
    });

    // Cleanup - delete app instance to free resources
    // Note: The delete method exists on the app instance
    try {
      const { deleteApp } = await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js");
      await deleteApp(secondaryApp);
    } catch (e) {
      console.warn("Could not delete secondary app:", e);
    }

    return user;
  } catch (error) {
    console.error("Erro ao criar profissional:", error);
    throw error;
  }
}