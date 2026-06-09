// This file is required for Expo/React Native SQLite migrations - https://orm.drizzle.team/quick-sqlite/expo

import journal from './meta/_journal.json';
import m0000 from './0000_jittery_zodiak';
import m0001 from './0001_add_batch_group_id';
import m0002 from './0002_add_expense_groups';
import m0003 from './0003_add_installment_group_id';
import m0004 from './0004_add_title_and_recurring';
import m0005 from './0005_add_weekly_recurring';
import m0006 from './0006_add_payment_status';
import m0007 from './0007_add_category_goals';
import m0008 from './0008_non_recurring_paid_by_default';
import m0009 from './0009_add_funds_tables';

export default {
  journal,
  migrations: {
    m0000,
    m0001,
    m0002,
    m0003,
    m0004,
    m0005,
    m0006,
    m0007,
    m0008,
    m0009,
  },
};
