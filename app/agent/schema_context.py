"""
Schema context for the agent — describes the Gold tables it can query.

This is injected into the agent's system prompt so it knows what tables
and columns exist, enabling it to write correct SQL.
"""

GOLD_SCHEMA_DESCRIPTION = """
Available read-only tables (all in dbo schema):

1. gold_account_balances (GL_Account_Code, Account_Name, Account_Class,
   transaction_count, total_balance)
   - Balance per GL account.

2. gold_monthly_summary (period_year, period_month, period_label,
   total_income, total_expense, net_amount, transaction_count)
   - Income/expense/net by month. period_label is 'YYYY-MM'.

3. gold_cash_position (current_balance, as_of_date, total_inflow,
   total_outflow, net_movement, bank_line_count)
   - Current cash (single row).

4. gold_vendor_spend (Vendor_ID, Vendor_Name, invoice_count, total_spend,
   total_tax, avg_invoice)
   - Spend per vendor.

5. gold_payables_aging (Vendor_ID, Vendor_Name, current_0_30, days_31_60,
   days_61_90, days_over_90, total_payable, invoice_count)
   - Accounts payable aging buckets per vendor.

6. gold_cash_runway (current_cash, avg_monthly_net, avg_monthly_burn,
   runway_months, status)
   - Cash runway (single row). status: PROFITABLE | BURNING | NO_DATA.
"""