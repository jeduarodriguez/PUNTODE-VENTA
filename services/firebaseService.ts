import { initializeApp, getApps, getApp } from "firebase/app";
import { getDatabase, ref, onValue, set, push, remove, update, Database } from "firebase/database";

// --- INSTRUCCIONES PARA MULTIDISPOSITIVO (TIEMPO REAL) ---
// 1. Ve a console.firebase.google.com y crea un proyecto.
// 2. Crea una "Realtime Database" en modo prueba.
// 3. Ve a Configuración del Proyecto -> General -> Tus apps (icono web </>)
// 4. Copia los valores de 'firebaseConfig' y pégalos abajo.

const firebaseConfig = {
  // PEGA TUS CREDENCIALES AQUÍ REEMPLAZANDO ESTOS VALORES:
  apiKey: "TU_API_KEY", 
  authDomain: "TU_PROYECTO.firebaseapp.com",
  databaseURL: "https://TU_PROYECTO-default-rtdb.firebaseio.com",
  projectId: "TU_PROYECTO",
  storageBucket: "TU_PROYECTO.appspot.com",
  messagingSenderId: "TU_SENDER_ID",
  appId: "TU_APP_ID"
};

// Lógica para detectar si se configuró la nube o seguimos en local
const isFirebaseConfigured = 
  firebaseConfig.apiKey !== "TU_API_KEY" && 
  firebaseConfig.apiKey !== "" && 
  firebaseConfig.databaseURL.indexOf("TU_PROYECTO") === -1;

let firebaseDb: Database | null = null;

if (isFirebaseConfigured) {
  try {
    const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    firebaseDb = getDatabase(app);
    console.log("✅ Conectado a la Nube (Firebase)");
  } catch (e) {
    console.error("❌ Error al conectar Firebase:", e);
  }
} else {
  console.log("⚠️ Modo Local (Sin sincronización). Configura firebaseService.ts para activar la nube.");
}

export const db = firebaseDb;
export const isCloudEnabled = isFirebaseConfigured;

// --- SISTEMA DE RESPALDO LOCAL (FALLBACK) ---
// Se usa solo si no hay configuración de nube
const getLocalData = (path: string) => {
  const parts = path.split('/');
  const root = parts[0];
  const storageKey = `pointy_data_${root}`;
  const raw = localStorage.getItem(storageKey);
  const data = raw ? JSON.parse(raw) : null;
  
  if (parts.length > 1 && data) {
    return data[parts[1]] || null;
  }
  return data;
};

const setLocalData = (path: string, value: any) => {
  const parts = path.split('/');
  const root = parts[0];
  const storageKey = `pointy_data_${root}`;
  
  // Obtener datos actuales para no sobrescribir todo el objeto si es una actualización parcial
  let currentRootData = JSON.parse(localStorage.getItem(storageKey) || '{}');

  if (parts.length === 1) {
    // Si es la raíz (ej: 'products'), sobrescribimos o fusionamos
    if (value === null) {
        localStorage.removeItem(storageKey);
    } else {
        localStorage.setItem(storageKey, JSON.stringify(value));
    }
  } else if (parts.length === 2) {
    // Si es un hijo (ej: 'products/id_123')
    if (value === null) {
        delete currentRootData[parts[1]];
    } else {
        currentRootData[parts[1]] = value;
    }
    localStorage.setItem(storageKey, JSON.stringify(currentRootData));
  }
  
  // Notificar a otras pestañas
  window.dispatchEvent(new Event('pointy_storage_update'));
};

// --- MÉTODOS PÚBLICOS (HÍBRIDOS) ---

export const syncPath = (path: string, callback: (data: any) => void) => {
  if (isCloudEnabled && db) {
    // MODO NUBE: Escucha cambios en tiempo real desde Firebase
    const dbRef = ref(db, path);
    return onValue(dbRef, (snapshot) => {
      const val = snapshot.val();
      callback(val);
    });
  } else {
    // MODO LOCAL: Escucha cambios de localStorage
    const handler = () => callback(getLocalData(path));
    handler(); // Primera carga inmediata
    window.addEventListener('pointy_storage_update', handler);
    return () => window.removeEventListener('pointy_storage_update', handler);
  }
};

export const saveData = async (path: string, data: any) => {
  if (isCloudEnabled && db) {
    await set(ref(db, path), data);
  } else {
    setLocalData(path, data);
  }
};

export const deleteData = async (path: string) => {
  if (isCloudEnabled && db) {
    await remove(ref(db, path));
  } else {
    // En local, borrar es pasar null al hijo específico
    const parts = path.split('/');
    if (parts.length === 2) {
      setLocalData(path, null);
    } else {
      localStorage.removeItem(`pointy_data_${path}`);
      window.dispatchEvent(new Event('pointy_storage_update'));
    }
  }
};

export const updateBatch = async (updates: Record<string, any>) => {
  if (isCloudEnabled && db) {
    await update(ref(db), updates);
  } else {
    // Aplicar cada actualización localmente
    Object.entries(updates).forEach(([path, value]) => {
      // Determinar si es borrado o escritura
      if (value === null) {
         // Lógica de borrado local simplificada para updateBatch
         const parts = path.split('/');
         if(parts.length === 2) setLocalData(path, null);
      } else {
         setLocalData(path, value);
      }
    });
  }
};