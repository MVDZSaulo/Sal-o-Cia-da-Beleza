import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore, collection, addDoc, doc, setDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAqwvfNgFCKno8IYSmOQHual4Ks7tWIO1c",
  authDomain: "cia-da-beleza-beb00.firebaseapp.com",
  projectId: "cia-da-beleza-beb00",
  storageBucket: "cia-da-beleza-beb00.firebasestorage.app",
  messagingSenderId: "567844800760",
  appId: "1:567844800760:web:8f16e64daa0315a9ae130d"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Lista de profissionais pré-cadastrados
const profissionais = [
  {
    nome: "Ana Costa",
    email: "ana@salão.com",
    role: "profissional",
    ativo: true,
    especialidades: ["cabelereiro"],
    especialidade: "Cabeleireira",
    telefone: "(11) 98888-8888",
    senhaTemporaria: "123456"
  },
  {
    nome: "Carlos Mendes",
    email: "carlos@salão.com",
    role: "profissional",
    ativo: true,
    especialidades: ["barbeiro"],
    especialidade: "Barbeiro",
    telefone: "(11) 97777-7777",
    senhaTemporaria: "123456"
  },
  {
    nome: "Beatriz Silva",
    email: "beatriz@salão.com",
    role: "profissional",
    ativo: true,
    especialidades: ["manicure", "pedicure"],
    especialidade: "Manicure e Pedicure",
    telefone: "(11) 96666-6666",
    senhaTemporaria: "123456"
  },
  {
    nome: "Ricardo Almeida",
    email: "ricardo@salão.com",
    role: "profissional",
    ativo: true,
    especialidades: ["massagista", "esteticista"],
    especialidade: "Massagista",
    telefone: "(11) 95555-5555",
    senhaTemporaria: "123456"
  },
  {
    nome: "Fernanda Lima",
    email: "fernanda@salão.com",
    role: "profissional",
    ativo: true,
    especialidades: ["cabelereiro", "colorista"],
    especialidade: "Colorista",
    telefone: "(11) 94444-4444",
    senhaTemporaria: "123456"
  }
];

async function inicializarProfissionais() {
  console.log("Iniciando cadastro de profissionais...");
  
  for (const prof of profissionais) {
    try {
      // Criar um ID consistente baseado no email
      const userId = prof.email.replace(/[@.]/g, '_');
      
      // Adicionar à coleção users
      const userRef = doc(db, "users", userId);
      await setDoc(userRef, {
        nome: prof.nome,
        email: prof.email,
        role: prof.role,
        ativo: prof.ativo,
        especialidades: prof.especialidades,
        especialidade: prof.especialidade,
        telefone: prof.telefone,
        criadoEm: new Date(),
        online: false
      });
      
      console.log(`✅ Profissional cadastrado: ${prof.nome} (ID: ${userId})`);
      
    } catch (error) {
      console.error(`❌ Erro ao cadastrar ${prof.nome}:`, error.message);
    }
  }
  
  console.log("🎉 Cadastro de profissionais concluído!");
}

// Executar a função
inicializarProfissionais();
