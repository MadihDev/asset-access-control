# Detailed Implementation Checklist: Address → Locations → Locks Hierarchy

## Phase 1: Database Schema & Migration

### Database Schema Changes

- [ ] **Create `locations` table**

  - [ ] Add `id` (primary key)
  - [ ] Add `name` (varchar, required)
  - [ ] Add `description` (text, optional)
  - [ ] Add `address_id` (foreign key to addresses table)
  - [ ] Add `created_at` timestamp
  - [ ] Add `updated_at` timestamp
  - [ ] Add indexes on `address_id` and `name`

- [ ] **Modify `locks` table**

  - [ ] Drop existing locks table (no data preservation needed)
  - [ ] Recreate with `location_id` column (foreign key to locations table)
  - [ ] Remove `address_id` column completely
  - [ ] Add proper indexes and constraints

- [ ] **Clean `user_permissions` table**
  - [ ] Drop all existing permissions (clean slate)
  - [ ] Keep table structure but reference `location_id` if needed
  - [ ] Or keep current `lock_id` reference since locks will have `location_id`
  - [ ] Update indexes for better performance

### Data Migration Scripts (Clean Slate Approach)

- [ ] **Clean database migration strategy**

  - [ ] Drop and recreate all related tables cleanly
  - [ ] Remove all existing locks, permissions, and related data
  - [ ] Keep only essential data (users, addresses, cities, projects)
  - [ ] Create fresh demo/test data with new location structure

- [ ] **Create new demo data scripts**
  - [ ] Script to create locations for Perfect IT Solutions example
  - [ ] Script to create locks within each location
  - [ ] Script to assign user permissions to specific locations
  - [ ] Script to create sample RFID keys and access logs

## Phase 2: Backend API Development

### New Location Endpoints

- [ ] **GET /api/locations**

  - [ ] Return all locations with address information
  - [ ] Include pagination
  - [ ] Add filtering options
  - [ ] Include lock count per location

- [ ] **GET /api/addresses/:addressId/locations**

  - [ ] Return locations for specific address
  - [ ] Include lock information
  - [ ] Add sorting options

- [ ] **POST /api/locations**

  - [ ] Create new location
  - [ ] Validate required fields
  - [ ] Check address_id exists
  - [ ] Return created location with ID

- [ ] **PUT /api/locations/:locationId**

  - [ ] Update existing location
  - [ ] Validate ownership/permissions
  - [ ] Update timestamp

- [ ] **DELETE /api/locations/:locationId**

  - [ ] Check if location has locks before deletion
  - [ ] Handle cascading deletes or prevent deletion
  - [ ] Update related permissions

- [ ] **GET /api/locations/:locationId/locks**
  - [ ] Return locks for specific location
  - [ ] Include lock status information
  - [ ] Add filtering and sorting

### Modified Existing Endpoints

- [ ] **Update locks endpoints**

  - [ ] Modify POST /api/locks to use location_id
  - [ ] Update PUT /api/locks/:lockId
  - [ ] Update lock retrieval endpoints
  - [ ] Update validation logic

- [ ] **Update user permissions endpoints**

  - [ ] Modify permission assignment logic
  - [ ] Update GET /api/users/:userId/permissions
  - [ ] Update POST /api/users/:userId/permissions
  - [ ] Handle location-based permission checks

- [ ] **Update access logs endpoints**

  - [ ] Include location information in access logs
  - [ ] Update log creation to include location context
  - [ ] Modify log retrieval to show location data

- [ ] **Update dashboard endpoints**
  - [ ] Modify statistics to group by locations
  - [ ] Update recent activity to show location context
  - [ ] Update monitoring endpoints

### Authentication & Authorization Updates

- [ ] **Update middleware**

  - [ ] Modify permission checking for location-based access
  - [ ] Update role-based access control
  - [ ] Ensure proper tenant isolation with locations

- [ ] **Update validation**
  - [ ] Location name uniqueness within address
  - [ ] Lock assignment validation
  - [ ] Permission assignment validation

## Phase 3: Frontend Development

### Locations Page Redesign

- [ ] **Create hierarchical tree component**

  - [ ] Address → Locations → Locks tree structure
  - [ ] Expand/collapse functionality
  - [ ] Search and filter capabilities
  - [ ] Drag-and-drop for lock reassignment

- [ ] **Location management interface**

  - [ ] Add new location modal/form
  - [ ] Edit location functionality
  - [ ] Delete location with confirmation
  - [ ] Bulk operations for locations

- [ ] **Lock management within locations**
  - [ ] Move locks between locations
  - [ ] Add locks to specific locations
  - [ ] Visual representation of lock status per location

### User Management Interface Updates

- [ ] **Permission assignment redesign**

  - [ ] Location-based permission selection
  - [ ] Multi-select interface for multiple locations
  - [ ] Visual hierarchy showing address → location relationship
  - [ ] Bulk permission assignment

- [ ] **User permission display**
  - [ ] Show user's location access in tree format
  - [ ] Quick access to modify permissions
  - [ ] Permission expiry display per location

### Dashboard Updates

- [ ] **Statistics widgets**

  - [ ] Location-based access statistics
  - [ ] Most accessed locations
  - [ ] Location-specific alerts and monitoring

- [ ] **Recent activity updates**

  - [ ] Group activities by location
  - [ ] Location-based filtering
  - [ ] Enhanced activity timeline with location context

- [ ] **Monitoring interface**
  - [ ] Real-time location status
  - [ ] Location-specific alerts
  - [ ] Lock status grouped by location

### UI/UX Improvements

- [ ] **Navigation updates**

  - [ ] Update menu structure for location hierarchy
  - [ ] Breadcrumb navigation for location context
  - [ ] Quick location switching

- [ ] **Mobile responsiveness**
  - [ ] Ensure tree view works on mobile
  - [ ] Touch-friendly location selection
  - [ ] Mobile-optimized permission management

## Phase 4: Testing & Quality Assurance

### Unit Tests

- [ ] **Backend unit tests**

  - [ ] Test all new location endpoints
  - [ ] Test modified lock endpoints
  - [ ] Test permission logic updates
  - [ ] Test validation rules

- [ ] **Frontend unit tests**
  - [ ] Test location tree component
  - [ ] Test permission assignment components
  - [ ] Test location management forms
  - [ ] Test dashboard widgets

### Integration Tests

- [ ] **End-to-end workflows**

  - [ ] Complete location creation workflow
  - [ ] Lock assignment to locations
  - [ ] User permission assignment flow
  - [ ] Access logging with location context

- [ ] **API integration tests**
  - [ ] Test hierarchical data retrieval
  - [ ] Test cascading operations
  - [ ] Test error handling
  - [ ] Test performance with large datasets

### User Acceptance Testing

- [ ] **Admin user scenarios**

  - [ ] Location management workflows
  - [ ] Permission assignment scenarios
  - [ ] Bulk operations testing

- [ ] **End user scenarios**
  - [ ] Location-based access requests
  - [ ] Mobile app usage with locations
  - [ ] Access history viewing

## Phase 5: Documentation & Deployment

### Documentation Updates

- [ ] **API documentation**

  - [ ] Document all new location endpoints
  - [ ] Update existing endpoint documentation
  - [ ] Add example requests/responses
  - [ ] Update authentication examples

- [ ] **User documentation**

  - [ ] Admin guide for location management
  - [ ] User guide for location-based access
  - [ ] Migration guide for existing users
  - [ ] Troubleshooting guide

- [ ] **Developer documentation**
  - [ ] Database schema documentation
  - [ ] Architecture diagrams update
  - [ ] Code comments and inline documentation

### Deployment Preparation

- [ ] **Environment setup**

  - [ ] Update staging environment
  - [ ] Test migration on staging
  - [ ] Performance testing
  - [ ] Load testing with location hierarchy

- [ ] **Production deployment plan**
  - [ ] Database migration strategy
  - [ ] Rollback plan
  - [ ] Monitoring and alerts setup
  - [ ] User communication plan

### Post-Deployment

- [ ] **Monitoring setup**

  - [ ] Location-specific metrics
  - [ ] Performance monitoring
  - [ ] Error tracking for new features
  - [ ] User adoption tracking

- [ ] **User training**
  - [ ] Admin training for location management
  - [ ] User training for new interface
  - [ ] Support documentation
  - [ ] FAQ updates

## Phase 6: Optimization & Refinement

### Performance Optimization

- [ ] **Database optimization**

  - [ ] Query optimization for hierarchical data
  - [ ] Index optimization
  - [ ] Caching strategy for location data

- [ ] **Frontend optimization**
  - [ ] Tree component performance
  - [ ] Lazy loading for large location lists
  - [ ] Efficient state management

### User Feedback & Iteration

- [ ] **Collect user feedback**

  - [ ] Admin user feedback on management interface
  - [ ] End user feedback on new structure
  - [ ] Performance feedback

- [ ] **Iterative improvements**
  - [ ] UI/UX refinements based on feedback
  - [ ] Feature enhancements
  - [ ] Bug fixes and optimizations

---

## Example Location Structure

**Perfect IT Solutions** (Address/Company)
├── IT Infrastructure Room
│ ├── Server rack lock #1
│ ├── Server rack lock #2
│ ├── Main room access lock
│ └── Network cabinet lock
├── Private Rooms
│ ├── Office door lock #1
│ ├── Office door lock #2
│ └── Filing cabinet lock
├── Conference Room
│ ├── Main conference room lock
│ └── AV equipment cabinet lock
├── Archive Rooms
│ ├── Main archive door lock
│ └── Document cabinet locks
├── Equipment Room
│ ├── Main equipment room lock
│ └── Tool cabinet locks
└── Maintenance Areas
├── Utility room lock
└── HVAC access lock

---

## Pre-Implementation Cleanup Checklist

### Files and Components to Remove/Deprecate

#### Backend Files to Remove

- [ ] **`backend/src/controllers/location.controller.ts`**

  - Current implementation treats addresses as "locations"
  - Will be replaced with new location-based controller
  - Contains address-based methods that will become obsolete

- [ ] **`backend/src/routes/location.routes.ts`**
  - Current routes are address-based (e.g., `/:addressId/users`)
  - Will be replaced with proper location hierarchy routes
  - Contains misleading terminology

#### Backend Components to Update

- [ ] **`backend/src/controllers/address.controller.ts`**

  - Update to work with new location hierarchy
  - Modify methods to include location relationships
  - Update count calculations to include location context

- [ ] **`backend/src/routes/address.routes.ts`**
  - May need additional routes for address → location management
  - Keep existing routes but extend functionality

#### Frontend Components to Remove/Replace

- [ ] **Current "Locations" terminology in `rfid-frontend/src/components/Locations.tsx`**
  - Component currently manages "addresses" but is named "Locations"
  - Need to rename or restructure to reflect true purpose
  - Update UI text and labels to be consistent

#### Database Cleanup Required

- [ ] **Complete data cleanup (no preservation needed)**

  - Drop all locks and related data completely
  - Drop all user permissions and access logs
  - Drop all RFID keys and assignments
  - Keep only: users, addresses, cities, projects, system config

- [ ] **Remove old test data scripts**
  - Delete `backend/add-perfectit-locks.*` files (outdated)
  - Remove any scripts that create locks with `addressId`
  - Clean up test files with old data structure

#### API Endpoints to Deprecate

- [ ] **Location routes that are actually address routes**
  - `/api/location/:addressId/*` routes are misleading
  - Should be renamed or restructured
  - Consider deprecation warnings before removal

### Configuration and Environment Updates

- [ ] **Update API documentation**

  - Remove references to old address-lock direct relationship
  - Update endpoint documentation
  - Add migration notes for API consumers

- [ ] **Update environment variables**
  - Review any address-related configuration
  - Add location-specific settings if needed

### Code References to Update

- [ ] **Search and replace patterns**

  - `addressId` references in lock operations
  - Direct address-lock relationships in queries
  - Permission checks that bypass location hierarchy

- [ ] **Update TypeScript types**
  - Interface definitions that assume direct address-lock relationship
  - Add new Location types
  - Update existing types to include location references

### Testing Files to Clean Up

- [ ] **Test files with address-lock assumptions**
  - `backend/__tests__/location.routes.test.ts` - update for new structure
  - Any integration tests that create locks directly under addresses
  - Update test data creation scripts

### Documentation to Remove/Update

- [ ] **Outdated architecture documentation**
  - Remove references to direct address-lock relationship
  - Update system diagrams
  - Update API documentation

### Migration Strategy for Cleanup (Clean Slate)

1. **Backup only essential data**
   - Export users, addresses, cities, projects
   - No need to backup locks, permissions, or access logs
2. **Complete schema rebuild**
   - Drop and recreate affected tables with new structure
   - Implement location hierarchy from scratch
3. **Create fresh demo data**
   - Build Perfect IT Solutions example with proper locations
   - Create realistic test data for development
4. **Remove all legacy components immediately**
   - No gradual migration needed
   - Clean removal of old address-lock direct relationships

### Expected Breaking Changes (Clean Slate Approach)

- [ ] **Complete API restructure**

  - All lock-related endpoints will change
  - New location-based endpoints will replace address-based ones
  - Permission endpoints will work with location hierarchy

- [ ] **Fresh database schema**

  - New location hierarchy tables
  - All locks, permissions, and access logs will be recreated
  - No backward compatibility needed

- [ ] **Frontend complete redesign**
  - New location management interface
  - Hierarchical navigation (Address → Location → Locks)
  - New permission assignment workflows

### Benefits of Clean Slate Approach

- [ ] **Simplified development**

  - No complex data migration scripts
  - No need to maintain backward compatibility
  - Clean, optimized database structure from start

- [ ] **Better performance**

  - Optimal indexes and relationships
  - No legacy data constraints
  - Fresh start with best practices

- [ ] **Cleaner codebase**
  - No deprecated code to maintain
  - Clear separation of concerns
  - Modern, hierarchical architecture

This cleanup ensures a clean foundation for implementing the new location hierarchy without legacy code conflicts.

---

This checklist provides a comprehensive roadmap for implementing the location hierarchy feature while ensuring quality, testing, and proper deployment procedures.
