const config = require("includes/config_finops");

config.clientes.filter(c => c.ativo).forEach(cliente => {

  // ======================================================================
  // SEÇÃO 1: TABELAS BASE E VIEWS DIÁRIAS (Roda todos os dias)
  // Substitui a criação simples de tabelas baseadas em views do Python
  // ======================================================================
  publish(`TNB_one_day_${cliente.nome}`, {
    type: "table", database: config.project_target, schema: cliente.dataset, tags: ["diario"]
  }).query(ctx => `SELECT * FROM \`${config.project_target}.${cliente.dataset}.vw_billing_1_day\``);

  publish(`tn_billing_30_day_${cliente.nome}`, {
    type: "table", database: config.project_target, schema: cliente.dataset, tags: ["diario"]
  }).query(ctx => `SELECT * FROM \`${config.project_target}.${cliente.dataset}.vw_billing_30_day\``);

  publish(`tn_dnComparativo_${cliente.nome}`, {
    type: "table", database: config.project_target, schema: cliente.dataset, tags: ["diario"]
  }).query(ctx => `SELECT * FROM \`${config.project_target}.${cliente.dataset}.vw_dnComparativo\``);

  publish(`tn_dnComparativoFull_${cliente.nome}`, {
    type: "table", database: config.project_target, schema: cliente.dataset, tags: ["diario"]
  }).query(ctx => `SELECT * FROM \`${config.project_target}.${cliente.dataset}.vw_dnComparativoFull\``);

  publish(`tn_descontos_${cliente.nome}`, {
    type: "table", database: config.project_target, schema: cliente.dataset, tags: ["diario"]
  }).query(ctx => `SELECT * FROM \`${config.project_target}.${cliente.dataset}.vw_descontos\``);

  publish(`tn_orcamento_real_${cliente.nome}`, {
    type: "table", database: config.project_target, schema: cliente.dataset, tags: ["diario"]
  }).query(ctx => `SELECT * FROM \`${config.project_target}.${cliente.dataset}.vw_orcamento_real\``);

  publish(`tn_billing_1_day_anomaly_${cliente.nome}`, {
    type: "table", database: config.project_target, schema: cliente.dataset, tags: ["diario"]
  }).query(ctx => `SELECT * FROM \`${config.project_target}.${cliente.dataset}.vw_billing_1_day_anomaly\``);


  // ======================================================================
  // SEÇÃO 2: OPERAÇÕES DE DELETE/INSERT (Atualizações Incrementais Customizadas)
  // Usamos 'operate' para executar múltiplos comandos DML como no Python
  // ======================================================================
  /*operate(`update_tn_billing_${cliente.nome}`)
    .tags(["diario"])
    .queries(ctx => [
      `DELETE FROM \`${config.project_target}.${cliente.dataset}.tn_billing\` WHERE DATE(usage_date) >= DATE_SUB(CURRENT_DATE(), INTERVAL 7 DAY) AND invoice >= DATE_TRUNC(DATE_SUB(CURRENT_DATE(), INTERVAL 1 MONTH), MONTH)`,
      `INSERT INTO \`${config.project_target}.${cliente.dataset}.tn_billing\`
       WITH base AS ( SELECT * FROM \`${config.project_billing_source}.Billing.clustered_billing_export_detalhado\` WHERE billing_account_id IN ('${cliente.billing_account_id}') AND DATE(usage_start_time, 'Etc/GMT+8') >= DATE_SUB(CURRENT_DATE(), INTERVAL 7 DAY) AND invoice >= DATE_TRUNC(DATE_SUB(CURRENT_DATE(), INTERVAL 1 MONTH), MONTH) )
       SELECT a.*, c.currency_conversion_rate_v2, b.cotacao AS cotacao_dolar
       FROM base AS a
       LEFT JOIN \`${config.project_target}.ipnet_cloud_externo.tn_cotacao_dolar\` AS b ON a.invoice = b.data AND b.cotacao IS NOT NULL
       LEFT JOIN (SELECT invoice AS usage_year_month, currency_conversion_rate AS currency_conversion_rate_v2 FROM base GROUP BY 1, 2) AS c ON a.invoice = c.usage_year_month`
    ]);

  operate(`update_tn_labels_${cliente.nome}`)
    .tags(["diario"])
    .queries(ctx => [
      `DELETE FROM \`${config.project_target}.${cliente.dataset}.tn_labels\` WHERE invoice >= DATE_TRUNC(DATE_SUB(CURRENT_DATE(), INTERVAL 5 DAY), MONTH)`,
      `INSERT INTO \`${config.project_target}.${cliente.dataset}.tn_labels\` SELECT invoice, usage_date, billing_account_id, project_id, service_description, sku_description, labels, cost, credits_amount, total_cost FROM \`${config.project_target}.Anomalia_todos_ids.tn_labels\` WHERE invoice >= DATE_TRUNC(DATE_SUB(CURRENT_DATE(), INTERVAL 5 DAY), MONTH) AND billing_account_id IN ('${cliente.billing_account_id}')`
    ]);

  operate(`update_tn_resources_${cliente.nome}`)
    .tags(["diario"])
    .queries(ctx => [
      `DELETE FROM \`${config.project_target}.${cliente.dataset}.tn_resources\` WHERE invoice >= DATE_TRUNC(DATE_SUB(CURRENT_DATE(), INTERVAL 5 DAY), MONTH)`,
      `INSERT INTO \`${config.project_target}.${cliente.dataset}.tn_resources\` SELECT billing_account_id, invoice, usage_date, project_id, service_description, resource_name, cost, credits_amount, total_cost FROM \`${config.project_target}.Anomalia_todos_ids.tn_resources\` WHERE invoice >= DATE_TRUNC(DATE_SUB(CURRENT_DATE(), INTERVAL 5 DAY), MONTH) AND billing_account_id IN ('${cliente.billing_account_id}')`
    ]);

  operate(`update_tn_anomaly_historic_${cliente.nome}`)
    .tags(["diario"])
    .queries(ctx => `INSERT INTO \`${config.project_target}.${cliente.dataset}.tn_anomaly_detection_historic\` SELECT * FROM \`${config.project_target}.${cliente.dataset}.tn_anomaly_detection\``);*/


  // ======================================================================
  // SEÇÃO 3: STORED PROCEDURES
  // ======================================================================
  operate(`call_sp_orcamento_${cliente.nome}`)
    .dependencies([`tn_orcamento_real_${cliente.nome}`])
    .tags(["diario"])
    .queries(ctx => `CALL \`${config.project_target}.${cliente.dataset}.sp_orcamento\`()`);

  operate(`call_sp_anomaly_${cliente.nome}`)
    .tags(["anomalia"])
    .queries(ctx => `CALL \`${config.project_target}.${cliente.dataset}.sp_anomaly\`()`);


  // ======================================================================
  // SEÇÃO 4: MODELOS ARIMA E PREVISÕES (O Coração da Inteligência)
  // ======================================================================
  
  // -- MENSAL --
  operate(`arima_model_last_month_${cliente.nome}`)
    .dependencies([`TNB_one_day_${cliente.nome}`])
    .tags(["mensal"])
    .queries(ctx => `
      CREATE OR REPLACE MODEL \`${config.project_target}.${cliente.dataset}.arima_model_last_month\` OPTIONS(model_type='ARIMA_PLUS', time_series_timestamp_col='data', time_series_data_col='custo', horizon=${config.arima_config.last_month.horizon}, auto_arima=TRUE, data_frequency='DAILY') AS
      SELECT CAST(usage_date AS DATE) AS data, CAST(SUM(total_cost) AS FLOAT64) AS custo FROM ${ctx.ref(`TNB_one_day_${cliente.nome}`)} WHERE usage_date > DATE_SUB(DATE_TRUNC(CURRENT_DATE(), MONTH), INTERVAL ${config.arima_config.last_month.interval_days} DAY) AND usage_date < DATE_SUB(DATE_TRUNC(CURRENT_DATE(), MONTH), INTERVAL 2 DAY) GROUP BY usage_date
    `);

  publish(`tn_forecast_last_month_${cliente.nome}`, {
    type: "table", database: config.project_target, schema: cliente.dataset, dependencies: [`arima_model_last_month_${cliente.nome}`], tags: ["mensal"]
  }).query(ctx => `
    WITH table1 AS (SELECT CAST(usage_date AS DATE) AS invoice, CAST(SUM(total_cost) AS FLOAT64) AS custo FROM ${ctx.ref(`TNB_one_day_${cliente.nome}`)} WHERE usage_date > DATE_SUB(DATE_TRUNC(CURRENT_DATE(), MONTH), INTERVAL 1 MONTH) AND usage_date <= DATE_SUB(CURRENT_DATE(), INTERVAL 2 DAY) GROUP BY usage_date),
    table2 AS (SELECT EXTRACT(DATE FROM forecast_timestamp) AS invoice, * EXCEPT(forecast_timestamp, standard_error, confidence_level, confidence_interval_lower_bound, confidence_interval_upper_bound) FROM ML.FORECAST(MODEL \`${config.project_target}.${cliente.dataset}.arima_model_last_month\`, STRUCT(${config.arima_config.last_month.horizon} AS horizon, 0.8 AS confidence_level)))
    SELECT * FROM table1 FULL OUTER JOIN table2 USING (invoice) ORDER BY invoice ASC
  `);

  // -- TRIMESTRAL --
  operate(`arima_model_last_trimester_${cliente.nome}`)
    .dependencies([`TNB_one_day_${cliente.nome}`])
    .tags(["trimestral"]) 
    .queries(ctx => `
      CREATE OR REPLACE MODEL \`${config.project_target}.${cliente.dataset}.arima_model_last_trimester\` OPTIONS(model_type='ARIMA_PLUS', time_series_timestamp_col='data', time_series_data_col='custo', horizon=${config.arima_config.last_trimester.horizon}, auto_arima=TRUE, data_frequency='DAILY') AS
      SELECT CAST(usage_date AS DATE) AS data, CAST(SUM(total_cost) AS FLOAT64) AS custo FROM ${ctx.ref(`TNB_one_day_${cliente.nome}`)} WHERE usage_date > DATE_SUB(DATE_TRUNC(CURRENT_DATE(), QUARTER), INTERVAL ${config.arima_config.last_trimester.interval_days} DAY) AND usage_date < DATE_SUB(DATE_TRUNC(CURRENT_DATE(), QUARTER), INTERVAL 2 DAY) GROUP BY usage_date
    `);

  publish(`tn_forecast_last_trimester_${cliente.nome}`, {
    type: "table", database: config.project_target, schema: cliente.dataset, dependencies: [`arima_model_last_trimester_${cliente.nome}`], tags: ["trimestral"]
  }).query(ctx => `
    WITH table1 AS (SELECT CAST(usage_date AS DATE) AS invoice, CAST(SUM(total_cost) AS FLOAT64) AS custo FROM ${ctx.ref(`TNB_one_day_${cliente.nome}`)} WHERE usage_date > DATE_SUB(DATE_TRUNC(CURRENT_DATE(), QUARTER), INTERVAL 3 MONTH) AND usage_date <= DATE_SUB(CURRENT_DATE(), INTERVAL 2 DAY) GROUP BY usage_date),
    table2 AS (SELECT EXTRACT(DATE FROM forecast_timestamp) AS invoice, * EXCEPT(forecast_timestamp, standard_error, confidence_level, confidence_interval_lower_bound, confidence_interval_upper_bound) FROM ML.FORECAST(MODEL \`${config.project_target}.${cliente.dataset}.arima_model_last_trimester\`, STRUCT(${config.arima_config.last_trimester.horizon} AS horizon, 0.8 AS confidence_level)))
    SELECT * FROM table1 FULL OUTER JOIN table2 USING (invoice) ORDER BY invoice ASC
  `);

  // -- SEMESTRAL --
  operate(`arima_model_last_semester_${cliente.nome}`)
    .dependencies([`TNB_one_day_${cliente.nome}`])
    .tags(["semestral"]) 
    .queries(ctx => `
      CREATE OR REPLACE MODEL \`${config.project_target}.${cliente.dataset}.arima_model_last_semester\` OPTIONS(model_type='ARIMA_PLUS', time_series_timestamp_col='data', time_series_data_col='custo', horizon=${config.arima_config.last_semester.horizon}, auto_arima=TRUE, data_frequency='DAILY') AS
      SELECT CAST(usage_date AS DATE) AS data, CAST(SUM(total_cost) AS FLOAT64) AS custo FROM ${ctx.ref(`TNB_one_day_${cliente.nome}`)} WHERE usage_date > DATE_SUB(DATE_TRUNC(CURRENT_DATE(), MONTH), INTERVAL ${config.arima_config.last_semester.interval_days} DAY) GROUP BY usage_date
    `);

  publish(`tn_forecast_last_semester_${cliente.nome}`, {
    type: "table", database: config.project_target, schema: cliente.dataset, dependencies: [`arima_model_last_semester_${cliente.nome}`], tags: ["semestral"]
  }).query(ctx => `
    WITH table1 AS (SELECT CAST(usage_date AS DATE) AS invoice, CAST(SUM(total_cost) AS FLOAT64) AS custo FROM ${ctx.ref(`TNB_one_day_${cliente.nome}`)} WHERE usage_date > DATE_SUB(DATE_TRUNC(CURRENT_DATE(), MONTH), INTERVAL 6 MONTH) AND usage_date <= DATE_SUB(CURRENT_DATE(), INTERVAL 2 DAY) GROUP BY usage_date),
    table2 AS (SELECT EXTRACT(DATE FROM forecast_timestamp) AS invoice, * EXCEPT(forecast_timestamp, standard_error, confidence_level, confidence_interval_lower_bound, confidence_interval_upper_bound) FROM ML.FORECAST(MODEL \`${config.project_target}.${cliente.dataset}.arima_model_last_semester\`, STRUCT(${config.arima_config.last_semester.horizon} AS horizon, 0.8 AS confidence_level)))
    SELECT * FROM table1 FULL OUTER JOIN table2 USING (invoice) ORDER BY invoice ASC
  `);

  /*
  // -- ANOMALIAS --
  operate(`anomaly_detection_180d_h35_${cliente.nome}`)
    .dependencies([`TNB_one_day_${cliente.nome}`])
    .tags(["anomalia"]) 
    .queries(ctx => `
      CREATE OR REPLACE MODEL \`${config.project_target}.${cliente.dataset}.anomaly_detection_180d_h35\` OPTIONS(model_type='ARIMA_PLUS', time_series_timestamp_col='data', time_series_data_col='custo', time_series_id_col='id_project_serv', horizon=${config.arima_config.anomaly.horizon}, auto_arima=TRUE, data_frequency='DAILY') AS
      SELECT CAST(usage_date AS DATE) AS data, id_project_serv, CAST(SUM(total_cost) AS FLOAT64) AS custo FROM ${ctx.ref(`TNB_one_day_${cliente.nome}`)} WHERE usage_date > DATE_SUB(DATE_TRUNC(CURRENT_DATE(), MONTH), INTERVAL ${config.arima_config.anomaly.interval_days} DAY) AND usage_date < DATE_SUB(DATE_TRUNC(CURRENT_DATE(), MONTH), INTERVAL 2 DAY) GROUP BY usage_date, id_project_serv
    `);

});*/
// -- ANOMALIAS (Simplificado para a PoC) --
  operate(`anomaly_detection_180d_h35_${cliente.nome}`)
    .dependencies([`TNB_one_day_${cliente.nome}`])
    .tags(["anomalia"]) 
    .queries(ctx => `
      CREATE OR REPLACE MODEL \`${config.project_target}.${cliente.dataset}.anomaly_detection_180d_h35\` 
      OPTIONS(
        model_type='ARIMA_PLUS', 
        time_series_timestamp_col='data', 
        time_series_data_col='custo', 
        horizon=${config.arima_config.anomaly.horizon}, 
        auto_arima=TRUE, 
        data_frequency='DAILY'
      ) AS
      SELECT 
        CAST(usage_date AS DATE) AS data, 
        CAST(SUM(total_cost) AS FLOAT64) AS custo 
      FROM ${ctx.ref(`TNB_one_day_${cliente.nome}`)} 
      WHERE usage_date > DATE_SUB(DATE_TRUNC(CURRENT_DATE(), MONTH), INTERVAL ${config.arima_config.anomaly.interval_days} DAY) 
        AND usage_date < DATE_SUB(DATE_TRUNC(CURRENT_DATE(), MONTH), INTERVAL 2 DAY) 
      GROUP BY usage_date
    `);
    });
    