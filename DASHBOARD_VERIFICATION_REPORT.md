# Dashboard Data Verification Report for TechCorp Admin in Amsterdam

## Verification Results (October 1, 2025)

### Dashboard vs Database Comparison

| Metric              | Dashboard Shows | Database Has | Match?          | Notes                             |
| ------------------- | --------------- | ------------ | --------------- | --------------------------------- |
| **Total Users**     | 6               | 6            | ✅ **MATCH**    | Perfect match                     |
| **Total Locks**     | 12              | **36**       | ❌ **MISMATCH** | Database has 3x more locks        |
| **Access Attempts** | 20              | **64**       | ❌ **MISMATCH** | Database has 3.2x more attempts   |
| **Online Locks**    | 11              | 11           | ✅ **MATCH**    | Perfect match                     |
| **Active Users**    | 3               | **4**        | ❌ **MISMATCH** | Database shows 1 more active user |
| **Active Keys**     | 4               | 4            | ✅ **MATCH**    | Perfect match                     |

### Detailed Analysis

#### ✅ **Matching Metrics (3/6)**

- **Total Users**: 6 users correctly identified in TechCorp Amsterdam context
- **Online Locks**: 11 locks showing as online/active
- **Active Keys**: 4 active RFID keys for users in this tenant

#### ❌ **Mismatched Metrics (3/6)**

##### 1. Total Locks Discrepancy (12 vs 36)

- **Dashboard Logic Issue**: May be filtering locks differently
- **Database Reality**: 36 total locks across 6 addresses in Amsterdam
- **Possible Causes**:
  - Dashboard filtering by specific project-city assignment
  - Different counting logic (e.g., only locks with recent activity)
  - UI aggregation bug

##### 2. Access Attempts Discrepancy (20 vs 64)

- **Dashboard Logic Issue**: Likely using different time window or filters
- **Database Reality**: 64 access attempts in last 30 days
- **Possible Causes**:
  - Dashboard using shorter time window (e.g., last 7 days vs 30 days)
  - Filtering by specific result types (granted vs denied)
  - Different user context filtering

##### 3. Active Users Discrepancy (3 vs 4)

- **Dashboard Logic Issue**: Different definition of "active"
- **Database Reality**: 4 users with recent access activity (last 7 days)
- **Possible Causes**:
  - Dashboard using different time window for "active"
  - Different criteria (login activity vs access activity)

### Database Context Details

#### 👥 **User Breakdown (6 total)**

```
- Bob Smith (bob.smith+amsterdam@techcorp.com) - 0 RFID Keys, 1 recent access
- Tech Admin (admin@techcorp.com) - 0 RFID Keys, 1 recent access
- Carol Davis (carol.davis+amsterdam@techcorp.com) - 1 RFID Key, 1 recent access
- Alice Johnson (alice.johnson+amsterdam@techcorp.com) - 2 RFID Keys, 2 recent accesses
- Tech User (user@techcorp.com) - 1 RFID Key, 0 recent accesses
- David Wilson (david.wilson+amsterdam@techcorp.com) - 0 RFID Keys, 0 recent accesses
```

#### 🔒 **Lock Distribution (36 total)**

- **Addresses**: 6 locations in Amsterdam
- **Lock Types**: Mix of DOOR and GATE locks
- **Status**: 11 online/active locks (matches dashboard)
- **Locations**:
  - Innovatieweg 25: Multiple locks
  - Technologielaan 1: Multiple locks
  - Havenstraat 45: Multiple locks
  - Scheepvaartweg 78: Multiple locks
  - Bouwplein 88: Multiple locks
  - Constructieweg 156: Multiple locks

#### 📊 **Access Activity (64 total in 30 days)**

- **Recent Activity**: Mix of GRANTED and DENIED attempts
- **Users Involved**: Various users including some not in TechCorp Amsterdam context
- **Lock Types**: Both DOOR and GATE locks being accessed
- **Time Range**: Last 30 days of activity

### Recommended Actions

#### 🔧 **Dashboard Logic Review**

1. **Lock Counting**: Review dashboard query for total locks - may need to align with database schema
2. **Access Attempts**: Verify time window and filtering criteria for access attempts
3. **Active Users**: Standardize definition of "active" users across dashboard and reports

#### 🐛 **Potential Issues to Investigate**

1. **Tenant Filtering**: Dashboard may be applying incorrect project-city filtering
2. **Time Windows**: Inconsistent time periods for "recent" activity calculations
3. **Query Logic**: Dashboard queries may not match the verification script logic

#### ✅ **Confirmed Working**

1. **User Management**: User counting and context assignment working correctly
2. **Lock Status**: Online/offline lock detection functioning properly
3. **RFID Key Management**: Active key counting accurate

### Database Health Status

- **Connection**: ✅ Healthy PostgreSQL connection
- **Data Integrity**: ✅ Proper relationships and constraints
- **Performance**: ✅ Queries executing efficiently
- **Schema**: ✅ All expected tables and relationships present

### Next Steps

1. Review dashboard SQL queries for lock counting logic
2. Standardize time windows for activity calculations
3. Verify tenant isolation logic in dashboard vs database
4. Consider adding debug logging to dashboard metrics calculation

---

**Verification Date**: October 1, 2025  
**Context**: TechCorp Admin in Amsterdam  
**Database**: PostgreSQL with Prisma ORM  
**Status**: 3/6 metrics accurate, 3/6 require investigation
