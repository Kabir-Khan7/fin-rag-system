/* ============================================================
   gold_cash_position — current cash on hand
   ------------------------------------------------------------
   Derives current cash from the most recent bank feed running
   balance. Also surfaces total inflows/outflows for context.
   Full-refresh (single snapshot row).
   ============================================================ */

USE fin_model;
GO

IF OBJECT_ID('dbo.gold_cash_position', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.gold_cash_position (
        gold_id            INT IDENTITY(1,1) PRIMARY KEY,
        current_balance    DECIMAL(18,2)   NULL,   -- latest running balance
        as_of_date         DATETIME2       NULL,   -- date of that latest bank line
        total_inflow       DECIMAL(18,2)   NOT NULL,
        total_outflow      DECIMAL(18,2)   NOT NULL,
        net_movement       DECIMAL(18,2)   NOT NULL,
        bank_line_count    INT             NOT NULL,
        computed_at        DATETIME2       NOT NULL DEFAULT SYSUTCDATETIME()
    );
END
GO
PRINT 'gold_cash_position table ready.';
GO