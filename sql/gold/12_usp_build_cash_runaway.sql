/* ============================================================
   usp_build_cash_runway
   ------------------------------------------------------------
   Full-refresh. Combines current cash (gold_cash_position) with
   average monthly net (gold_monthly_summary) to compute runway.
   Run AFTER cash_position and monthly_summary are built.
   ============================================================ */

USE fin_model;
GO

CREATE OR ALTER PROCEDURE dbo.usp_build_cash_runway
AS
BEGIN
    SET NOCOUNT ON;

    BEGIN TRY
        BEGIN TRANSACTION;

        TRUNCATE TABLE dbo.gold_cash_runway;

        DECLARE @current_cash DECIMAL(18,2);
        DECLARE @avg_net DECIMAL(18,2);

        -- Current cash from the cash position snapshot.
        SELECT TOP 1 @current_cash = current_balance
        FROM dbo.gold_cash_position;

        -- Average monthly net across all months we have.
        SELECT @avg_net = AVG(net_amount)
        FROM dbo.gold_monthly_summary;

        DECLARE @burn DECIMAL(18,2);
        DECLARE @runway DECIMAL(10,1);
        DECLARE @status VARCHAR(50);

        IF @avg_net IS NULL OR @current_cash IS NULL
        BEGIN
            SET @status = 'NO_DATA';
            SET @burn = NULL;
            SET @runway = NULL;
        END
        ELSE IF @avg_net >= 0
        BEGIN
            -- Net positive on average = profitable, no runway concern.
            SET @status = 'PROFITABLE';
            SET @burn = 0;
            SET @runway = NULL;   -- infinite / not applicable
        END
        ELSE
        BEGIN
            -- Net negative = burning. Burn is the positive magnitude.
            SET @status = 'BURNING';
            SET @burn = ABS(@avg_net);
            SET @runway = CASE
                WHEN @burn > 0 THEN CAST(@current_cash / @burn AS DECIMAL(10,1))
                ELSE NULL
            END;
        END

        INSERT INTO dbo.gold_cash_runway
            (current_cash, avg_monthly_net, avg_monthly_burn, runway_months, status)
        VALUES
            (@current_cash, @avg_net, @burn, @runway, @status);

        COMMIT TRANSACTION;

        SELECT 'gold_cash_runway' AS metric_table, 1 AS rows_built;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH
END
GO
PRINT 'usp_build_cash_runway ready.';
GO