# ☁️ PoC FinOps Unificado: Pipeline de Dados & Machine Learning

![Google Cloud](https://img.shields.io/badge/Google_Cloud-%234285F4.svg?style=for-the-badge&logo=google-cloud&logoColor=white)
![BigQuery](https://img.shields.io/badge/BigQuery-669DF6?style=for-the-badge&logo=google-cloud&logoColor=white)
![Dataform](https://img.shields.io/badge/Dataform-4285F4?style=for-the-badge&logo=google-cloud&logoColor=white)
![SQL Analytics & DML](https://img.shields.io/badge/SQL_Analytics_%26_DML-E34F26?style=for-the-badge&logo=postgresql&logoColor=white)
![JavaScript](https://img.shields.io/badge/javascript-%23323330.svg?style=for-the-badge&logo=javascript&logoColor=%23F7DF1E)
![Cloud FinOps](https://img.shields.io/badge/Cloud_FinOps-00BFA5?style=for-the-badge)

> **Prova de Conceito (PoC)** desenvolvida para a migração, otimização e unificação do pipeline de dados FinOps e modelos preditivos (`ARIMA_PLUS`) no Google Dataform, substituindo scripts monolíticos em Python.

---

## 📌 O Problema
A arquitetura legada baseava-se num script Python complexo executado num notebook, que processava sequencialmente operações de DML (Delete/Insert), chamadas de *Stored Procedures* e treino de modelos de Machine Learning. 

**Limitações encontradas:**
* **Baixa Escalabilidade:** O processamento sequencial dificultava a adição de novos clientes.
* **Complexidade de Agendamento:** Lógica pesada de `if/else` baseada em datas para adivinhar quando rodar modelos mensais, trimestrais ou semestrais.
* **Riscos de Execução:** Ausência de um grafo de dependências sólido (se uma tabela falhasse, o modelo tentava treinar mesmo assim).

## 🚀 A Solução (O "Plano A")
Migração completa para o **Google Dataform**, aproveitando o poder do BigQuery para orquestração nativa, paralelismo e Machine Learning via SQL (BQML).

### Principais Funcionalidades Implementadas:
1. **Unificação do Pipeline:** Todos os modelos ARIMA (Mensal, Trimestral, Semestral) e Deteção de Anomalias consolidados num único espaço de trabalho, evitando a fragmentação de repositórios.
2. **Orquestração por Tags:** A lógica de calendário foi extraída do código. Utilizamos tags (`diario`, `mensal`, `trimestral`, `semestral`, `anomalia`) que permitem ao **Cloud Scheduler** disparar apenas os recursos necessários em dias específicos, otimizando radicalmente os custos computacionais.
3. **Escalabilidade Dinâmica com JavaScript:** Utilização de loops em `JS` para gerar dinamicamente o *Grafo Acíclico Dirigido (DAG)* para múltiplos clientes em paralelo.
4. **Gestão Segura de Dependências:** Modelos de *forecast* apenas são criados se e quando o treino do modelo base terminar com sucesso.
5. **Configuração Centralizada:** Parâmetros matemáticos do ARIMA (horizonte, histórico de dias) isolados em um ficheiro de configuração (`config_finops.js`).

---

## 📂 Estrutura do Projeto

```text
├── definitions/
│   └── pipeline_arima.js    # Script principal que gera tabelas, DMLs, Procedures e BQML dinamicamente.
├── includes/
│   └── config_finops.js     # Objeto de configuração central contendo a matriz de clientes e parâmetros ARIMA.
├── workflow_settings.yaml   # Configurações do projeto e target dataset no Dataform.
└── README.md
```

---

## 📸 Grafo de Execução e Sucesso da PoC

*(Adicione aqui a imagem do Dataform com todas as execuções a verde)*
![Dataform Execution](https://drive.google.com/file/d/1sUP1ppgU6p2qj97f1XetCq9yC-EfsmfU/view?usp=drive_link)

A imagem acima comprova o paralelismo da execução e a conclusão com sucesso do ciclo completo de agregação de *Billing*, limpeza de histórico, treino de modelos e tabelas de previsão final.

---

## ⚙️ Como Executar e Orquestrar
1. Clone este repositório no seu Workspace do Dataform no Google Cloud.
2. No ficheiro `includes/config_finops.js`, ative os clientes desejados mudando a flag `ativo: true`.
3. Teste a compilação no painel do Dataform (*Compiled Graph* deve gerar a árvore de dependências).
4. No **Google Cloud Scheduler** (ou Workflows), crie *jobs* independentes chamando a API do Dataform com as respetivas tags no Payload:
   * Job Diário (Roda todo dia): `"tags": ["diario"]`
   * Job Mensal (Roda dia 1 de cada mês): `"tags": ["mensal"]`
   * Job Trimestral (Roda 1 de Jan, 1 de Abr, etc): `"tags": ["trimestral"]`

---
*Desenvolvido como Prova de Conceito para a infraestrutura de Cloud FinOps.*

---
## Autor

João Batista Rodrigues Ribeiro

Estudante de Engenharia da Computação, com interesse em Dados, Cloud, Automação, IA, SQL, Python e soluções voltadas para organização e melhoria de processos.
