// Execute este código no console do navegador na página de agendamento

async function corrigirProfissionais() {
  const profissionais = [
    {
      id: "prof_ana",
      nome: "Ana Costa",
      email: "ana@salao.com",
      especialidade: "Cabeleireira",
      especialidades: ["cabelereiro"]
    },
    {
      id: "prof_carlos", 
      nome: "Carlos Mendes",
      email: "carlos@salao.com",
      especialidade: "Barbeiro",
      especialidades: ["barbeiro"]
    },
    {
      id: "prof_beatriz",
      nome: "Beatriz Silva",
      email: "beatriz@salao.com", 
      especialidade: "Manicure",
      especialidades: ["manicure", "pedicure"]
    }
  ];

  // Adicionar ao select manualmente
  const select = document.getElementById('profissional');
  if (select) {
    select.innerHTML = '<option value="">Selecione o profissional</option>';
    
    profissionais.forEach(prof => {
      const option = document.createElement('option');
      option.value = prof.id;
      option.textContent = `${prof.nome} - ${prof.especialidade}`;
      select.appendChild(option);
    });
    
    console.log('Profissionais adicionados ao select:', profissionais.length);
  }
}

// Executar
corrigirProfissionais();