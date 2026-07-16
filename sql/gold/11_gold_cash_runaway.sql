/* ============================================================
   gold_cash_runway — how long until cash runs out
   ------------------------------------------------------------
   Runway = current cash / average monthly burn. Derived from
   gold_cash_position (cash) and gold_monthly_summary (burn).
   Full-refresh, single snapshot row.
   ============================================================ */

USE fin_model;
GO

IF OBJECT_ID('dbo.gold_cash_runway', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.gold_cash_runway (
        gold_id             INT IDENTITY(1,1) PRIMARY KEY,
        current_cash        DECIMAL(18,2)   NULL,
        avg_monthly_net     DECIMAL(18,2)   NULL,   -- avg net across months (negative = burn)
        avg_monthly_burn    DECIMAL(18,2)   NULL,   -- positive burn figure when net is negative
        runway_months       DECIMAL(10,1)   NULL,   -- cash / burn; NULL if profitable
        status              VARCHAR(50)     NOT NULL, -- 'PROFITABLE' | 'BURNING' | 'NO_DATA'
        computed_at         DATETIME2       NOT NULL DEFAULT SYSUTCDATETIME()
    );
END
GO
PRINT 'gold_cash_runway table ready.';
GO