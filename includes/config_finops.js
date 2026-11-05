module.exports = {
  // ----------------------------------------------------------------------
  // 1. MAPEAMENTO DE PROJETOS (Organização da Arquitetura)
  // ----------------------------------------------------------------------
  // project_billing_source: É o projeto de origem, onde os dados brutos de faturamento caem diariamente.
  project_billing_source: "gen-lang-client-0862909089",
  
  // project_target: É o nosso projeto de destino, onde o Dataform vai gravar as tabelas tratadas e treinar os modelos de IA.
  project_target: "gen-lang-client-0862909089",
  
  // ----------------------------------------------------------------------
  // 2. MATRIZ DE CLIENTES (Escalabilidade / Multi-tenant)
  // ----------------------------------------------------------------------
  // Por que fizemos isso? No Python, as variáveis eram soltas e focadas em 1 cliente.
  // Aqui criamos uma lista (array). Se a IPNET colocar 10 clientes novos amanhã, 
  // não precisamos duplicar código SQL. Basta adicionar um novo bloco aqui dentro.
  clientes: [
    {
      nome: "bahema",                      // Usado para gerar o sufixo das tabelas (ex: tn_billing_bahema)
      dataset: "bahema_com_br_cbd",        // Dataset oficial do cliente no BigQuery
      billing_account_id: "bbbb",          // ID do faturamento no GCP que filtra os dados desse cliente
      multiplicador: 1,                    // Fator financeiro (pode ser usado para margem/desconto)
      ativo: true                          // "Chave geral": se o cliente cancelar, mudamos para 'false' e o Dataform para de rodar e cobrar processamento dele.
    }
  ],

  // ----------------------------------------------------------------------
  // 3. PARÂMETROS DE MACHINE LEARNING (Substitui os "IFs" do Python)
  // ----------------------------------------------------------------------
  // Por que fizemos isso? Para não deixar números "mágicos" perdidos dentro do SQL.
  // horizon: Quantos dias para o futuro o modelo ARIMA vai tentar prever.
  // interval_days: Quantos dias de histórico (passado) o modelo precisa olhar para aprender.
  arima_config: {
    last_month:     { horizon: 33,  interval_days: 35 },
    last_trimester: { horizon: 95,  interval_days: 97 },
    last_semester:  { horizon: 185, interval_days: 187 },
    anomaly:        { horizon: 35,  interval_days: 182 }
  }
};