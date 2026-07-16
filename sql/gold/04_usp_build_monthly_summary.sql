/* ============================================================
   usp_build_monthly_summary
   ------------------------------------------------------------
   Full-refresh. Classifies posted subledger transactions by
   account class (Income/Revenue = income; Expense = expense),
   aggregates by month, and computes net.
   ============================================================ */

USE fin_model;
GO

CREATE OR ALTER PROCEDURE dbo.usp_build_monthly_summary
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @rows INT = 0;

    BEGIN TRY
        BEGIN TRANSACTION;

        TRUNCATE TABLE dbo.gold_monthly_summary;

        ;WITH classified AS (
            SELECT
                YEAR(s.Document_Date)  AS period_year,
                MONTH(s.Document_Date) AS period_month,
                s.Amount,
                coa.Account_Class,
                -- Bucket each transaction by its account class.
                CASE
                    WHEN coa.Account_Class IN ('Income', 'Revenue') THEN s.Amount
                    ELSE 0
                END AS income_amount,
                CASE
                    WHEN coa.Account_Class = 'Expense' THEN s.Amount
                    ELSE 0
                END AS expense_amount
            FROM dbo.silver_subledger s
            LEFT JOIN dbo.silver_chart_of_accounts coa
                ON s.GL_Account_Code = coa.GL_Account_Code
            WHERE s.Status = 'Posted'
              AND s.Document_Date IS NOT NULL
        )
        INSERT INTO dbo.gold_monthly_summary
            (period_year, period_month, period_label,
             total_income, total_expense, net_amount, transaction_count)
        SELECT
            period_year,
            period_month,
            -- Build 'YYYY-MM' label (zero-padded month).
            CONCAT(period_year, '-', RIGHT('0' + CAST(period_month AS VARCHAR(2)), 2)),
            SUM(income_amount)                    AS total_income,
            SUM(expense_amount)                   AS total_expense,
            SUM(income_amount) - SUM(expense_amount) AS net_amount,
            COUNT(*)                              AS transaction_count
        FROM classified
        GROUP BY period_year, period_month;

        SET @rows = @@ROWCOUNT;

        COMMIT TRANSACTION;

        SELECT 'gold_monthly_summary' AS metric_table, @rows AS rows_built;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH
END
GO
PRINT 'usp_build_monthly_summary ready.';
GO