/* ============================================================
   gold_monthly_summary — income, expense, net by month
   ------------------------------------------------------------
   Classifies posted transactions as income vs expense using the
   account class from chart_of_accounts, then aggregates by
   calendar month. Full-refresh.
   ============================================================ */

USE fin_model;
GO

IF OBJECT_ID('dbo.gold_monthly_summary', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.gold_monthly_summary (
        gold_id          INT IDENTITY(1,1) PRIMARY KEY,
        period_year      INT             NOT NULL,
        period_month     INT             NOT NULL,
        period_label     VARCHAR(7)      NOT NULL,   -- 'YYYY-MM'
        total_income     DECIMAL(18,2)   NOT NULL,
        total_expense    DECIMAL(18,2)   NOT NULL,
        net_amount       DECIMAL(18,2)   NOT NULL,   -- income - expense
        transaction_count INT            NOT NULL,
        computed_at      DATETIME2       NOT NULL DEFAULT SYSUTCDATETIME()
    );
END
GO
PRINT 'gold_monthly_summary table ready.';
GO