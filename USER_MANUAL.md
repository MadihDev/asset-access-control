# 📖 **Asset Access Control System - User Manual**

## 🎯 **Overview**

The Asset Access Control System is a comprehensive multi-tenant platform for managing physical access to buildings, offices, and facilities. With a **95.9% Security Rating**, the system features enterprise-grade security including enhanced JWT authentication, real-time security monitoring, and multi-layer protection. This manual provides step-by-step instructions for all user types to effectively use the system.

---

## 👥 **User Roles & Permissions**

### **ADMIN**

- Full system access within their tenant (company)
- Manage users, locations, locks, and permissions
- View all access logs and generate reports
- Configure system settings

### **SUPERVISOR**

- Manage users and permissions within assigned locations
- View access logs for supervised areas
- Generate reports for managed locations
- Cannot modify system configuration

### **USER**

- View assigned locks and locations
- Use RFID cards for physical access
- View personal access history
- Update personal profile information

---

## 🚀 **Getting Started**

### **Accessing the System**

1. **Open your web browser** and navigate to the system URL
2. **Secure Login Page** will appear with the following fields:

![Login Form]

- **Username**: Your assigned username
- **Password**: Your password (enterprise security requirements apply)
- **Project**: Select your company/organization
- **City**: Select your city location
- **Two-Factor Authentication**: Enter OTP code if enabled

3. **Click "Sign In"** to access the dashboard

**Security Features:**

- RFC 7519 compliant JWT tokens with enhanced security claims
- Multi-factor authentication support for enhanced security
- Real-time security monitoring and anomaly detection
- Rate limiting protection against brute force attacks

### **First Time Login**

If this is your first time logging in:

1. **Use the credentials** provided by your administrator
2. **Change your password** immediately:

   - Click your profile icon (top right)
   - Select "Change Password"
   - Enter current and new password
   - Click "Update Password"

3. **Verify your profile information**:
   - Click "Profile" from the user menu
   - Update any incorrect information
   - Save changes

---

## 🏠 **Dashboard Overview**

After logging in, you'll see the main dashboard with:

### **Navigation Menu**

- **🏠 Dashboard**: System overview and quick stats
- **🔐 Locks**: Lock management and access control
- **📍 Locations**: Location hierarchy and management
- **👥 Users**: User management (ADMIN/SUPERVISOR only)
- **📊 Access Logs**: View access history and reports
- **🛡️ Security**: Security monitoring and alerts (ADMIN only)
- **⚙️ Settings**: System configuration (ADMIN only)

### **Dashboard Widgets**

**Quick Stats (Top Row):**

- **Total Locks**: Number of locks you can access
- **Active Users**: Users in your organization
- **Today's Access**: Access events today
- **System Status**: Overall system health

**Recent Activity:**

- Latest access events
- Recent user additions
- Lock status changes
- System notifications

**Quick Actions:**

- Add new user
- Create new lock
- Generate access report
- Bulk operations

---

## 🔐 **Lock Management**

### **Viewing Locks**

**Tree View (Default):**

1. Navigate to **"Locks"** in the main menu
2. **Expandable tree structure** shows:
   - Company → City → Address → Location → Locks
3. **Click the arrow** (▶) to expand/collapse sections
4. **Lock status indicators**:
   - 🟢 Green: Available/Unlocked
   - 🔴 Red: Locked/Restricted
   - 🟡 Yellow: Maintenance required
   - ⚫ Gray: Offline/Inactive

**List View:**

1. Click **"List View"** toggle at the top
2. **Table format** showing:
   - Lock Name
   - Location
   - Status
   - Last Access
   - Actions

### **Lock Details**

**View Lock Information:**

1. **Click on any lock** in tree or list view
2. **Lock Details Panel** shows:
   - Lock name and description
   - Physical location details
   - Current status
   - Access permissions
   - Recent access history

**Lock Actions (ADMIN/SUPERVISOR):**

- **Edit Lock**: Modify lock details
- **Assign Users**: Grant/revoke access
- **View History**: Complete access log
- **Lock/Unlock**: Remote control (if supported)

### **Adding New Locks (ADMIN Only)**

1. **Click "Add Lock"** button
2. **Fill in lock details**:

   - **Lock Name**: Descriptive name (e.g., "Main Office Door")
   - **Description**: Additional details
   - **Location**: Select from location hierarchy
   - **Lock Type**: Physical lock type
   - **RFID Identifier**: Unique RFID ID

3. **Configure Access**:

   - **Default Access**: Who gets automatic access
   - **Time Restrictions**: Operating hours
   - **Special Permissions**: Holiday/emergency access

4. **Click "Create Lock"** to save

### **Managing Lock Access**

**Assign Users to Lock:**

1. **Select a lock** from the list
2. **Click "Manage Access"**
3. **Add Users**:
   - Search for users by name
   - Select users to grant access
   - Set permission level (temporary/permanent)
   - Set time restrictions if needed
4. **Click "Save Changes"**

**Remove Access:**

1. **Go to lock's access list**
2. **Click "Remove"** next to user's name
3. **Confirm removal**

**Bulk Access Management:**

1. **Select multiple locks** using checkboxes
2. **Click "Bulk Actions"**
3. **Choose action**:
   - Assign users to all selected locks
   - Remove users from all selected locks
   - Update time restrictions
4. **Apply changes**

---

## 📍 **Location Management**

### **Understanding Location Hierarchy**

The system uses a 4-level hierarchy:

```
Company (Tenant)
  └── City
      └── Address
          └── Location
              └── Locks
```

### **Viewing Locations**

1. **Navigate to "Locations"**
2. **Tree structure** displays hierarchy
3. **Location information** includes:
   - Name and description
   - Address details
   - Number of locks
   - Assigned users
   - Access statistics

### **Adding Locations (ADMIN Only)**

**Add New Address:**

1. **Click "Add Address"**
2. **Enter details**:
   - Address name
   - Street address
   - Postal code
   - Contact information
3. **Save address**

**Add New Location within Address:**

1. **Select an address**
2. **Click "Add Location"**
3. **Enter details**:
   - Location name (e.g., "2nd Floor Office")
   - Description
   - Floor/room number
   - Capacity
4. **Save location**

### **Managing Location Access**

**Assign Supervisors:**

1. **Select a location**
2. **Click "Manage Supervisors"**
3. **Add/remove users** with SUPERVISOR role
4. **Set supervision scope**

---

## 👥 **User Management**

### **Viewing Users (ADMIN/SUPERVISOR)**

1. **Navigate to "Users"**
2. **User list** shows:

   - Name and email
   - Role (ADMIN/SUPERVISOR/USER)
   - Status (Active/Inactive)
   - Last login
   - Assigned locks count

3. **Filter and search**:
   - Filter by role
   - Search by name/email
   - Sort by various criteria

### **Adding New Users (ADMIN Only)**

1. **Click "Add User"** button
2. **Fill user information**:

   - **Personal Details**:
     - First Name, Last Name
     - Email address
     - Phone number
   - **Account Details**:
     - Username (must be unique)
     - Password (temporary)
     - Role (ADMIN/SUPERVISOR/USER)
   - **Access Details**:
     - Department
     - Start date
     - End date (if temporary)

3. **Assign Locations** (optional):

   - Select locations user should access
   - Set permission levels
   - Configure time restrictions

4. **Click "Create User"**

### **Managing User Permissions**

**View User Details:**

1. **Click on user** in the list
2. **User Profile** shows:
   - Personal information
   - Current permissions
   - Access history
   - Lock assignments

**Modify Permissions:**

1. **Click "Edit Permissions"**
2. **Add/Remove Locks**:
   - Search available locks
   - Select locks to grant access
   - Set time restrictions
   - Set expiry dates
3. **Apply Changes**

**Bulk User Operations:**

1. **Select multiple users** with checkboxes
2. **Choose bulk action**:
   - Assign locks to all selected users
   - Change role for selected users
   - Deactivate/activate users
   - Export user data
3. **Confirm and apply changes**

### **Managing User Roles**

**Change User Role (ADMIN Only):**

1. **Select user** from list
2. **Click "Change Role"**
3. **Select new role**:
   - **ADMIN**: Full system access
   - **SUPERVISOR**: Location-based management
   - **USER**: Basic access only
4. **Confirm change**

**Role-Based Restrictions:**

- **SUPERVISOR** can only manage users in their assigned locations
- **USER** cannot manage other users
- Role changes take effect immediately

---

## 📊 **Access Logs & Reporting**

### **Viewing Access Logs**

1. **Navigate to "Access Logs"**
2. **Log entries** show:
   - Date and time
   - User name
   - Lock name
   - Location
   - Access result (Success/Denied)
   - Method (RFID card, manual, etc.)

### **Filtering Access Logs**

**Date Range:**

1. **Select date picker**
2. **Choose start and end dates**
3. **Apply filter**

**User Filter:**

1. **Use "Filter by User" dropdown**
2. **Select specific user or "All Users"**
3. **Apply filter**

**Location Filter:**

1. **Use "Filter by Location" dropdown**
2. **Select specific location/lock**
3. **Apply filter**

**Status Filter:**

- **All Events**: Show all access attempts
- **Successful Only**: Show only successful access
- **Denied Only**: Show only denied attempts
- **Errors Only**: Show system errors

### **Generating Reports**

**Access Summary Report:**

1. **Click "Generate Report"**
2. **Select report type**: "Access Summary"
3. **Choose parameters**:
   - Date range
   - Users to include
   - Locations to include
4. **Select format**: PDF, Excel, CSV
5. **Click "Generate"**

**User Activity Report:**

1. **Select "User Activity" report**
2. **Choose specific user or all users**
3. **Set date range**
4. **Include additional details**:
   - Lock usage patterns
   - Time-based analysis
   - Unusual activity detection
5. **Generate report**

**Location Usage Report:**

1. **Select "Location Usage" report**
2. **Choose locations to analyze**
3. **Set reporting period**
4. **Include metrics**:
   - Peak usage times
   - Most accessed locks
   - Usage trends
5. **Generate report**

### **Scheduled Reports (ADMIN Only)**

1. **Click "Schedule Reports"**
2. **Create new schedule**:
   - Report type
   - Recipients (email addresses)
   - Frequency (daily, weekly, monthly)
   - Time to send
3. **Save schedule**

---

## 💳 **RFID Card Management**

### **Physical Access Process**

1. **Approach the lock** with your assigned RFID card
2. **Hold card near RFID reader** (usually within 2-3 cm)
3. **Wait for response**:
   - **Green light/beep**: Access granted
   - **Red light/beep**: Access denied
   - **No response**: Contact administrator

### **RFID Card Issues**

**Card Not Working:**

1. **Check card assignment** in your profile
2. **Verify lock permissions** with supervisor
3. **Try cleaning the card** with a dry cloth
4. **Report issues** to administrator

**Lost/Stolen Card:**

1. **Immediately notify** your administrator
2. **Administrator will deactivate** the old card
3. **Request replacement card**
4. **Update system** with new card ID

### **Managing RFID Cards (ADMIN/SUPERVISOR)**

**Assign Card to User:**

1. **Go to user profile**
2. **Click "Manage RFID Cards"**
3. **Add new card**:
   - Enter card ID (scan or manual entry)
   - Set activation date
   - Set expiry date (optional)
4. **Save card assignment**

**Deactivate Card:**

1. **Find user with card**
2. **Go to RFID card section**
3. **Click "Deactivate"** next to card
4. **Confirm deactivation**

---

## ⚙️ **Settings & Configuration**

### **Profile Settings**

**Update Personal Information:**

1. **Click profile icon** (top right)
2. **Select "Profile"**
3. **Update information**:
   - Name, email, phone
   - Notification preferences
   - Password change
4. **Save changes**

**Notification Preferences:**

- **Email notifications**: Access alerts, reports
- **Browser notifications**: Real-time alerts
- **SMS notifications**: Critical security alerts (if enabled)

### **System Settings (ADMIN Only)**

**Security Settings:**

1. **Navigate to "Settings" → "Security"**
2. **Configure options**:
   - **Password Policy**: Minimum length, complexity
   - **Session Timeout**: Auto-logout time
   - **Failed Login Attempts**: Account lockout threshold
   - **Two-Factor Authentication**: Enable/disable 2FA

**Access Control Settings:**

1. **Go to "Settings" → "Access Control"**
2. **Set default policies**:
   - **Default lock behavior**: Fail-safe or fail-secure
   - **Access logging level**: Basic or detailed
   - **Time zone**: System-wide time zone
   - **Business hours**: Default operating hours

**Notification Settings:**

1. **Select "Settings" → "Notifications"**
2. **Configure alerts**:
   - **Security events**: Failed access attempts
   - **System events**: Lock offline, maintenance
   - **User events**: New user registration
   - **Report delivery**: Scheduled report settings

---

## 🔍 **Search & Advanced Features**

### **Global Search**

1. **Use search bar** at the top of any page
2. **Search across**:

   - User names and emails
   - Lock names and locations
   - Access log entries
   - Location names

3. **Search results** show:
   - Matching items by category
   - Quick action buttons
   - Direct navigation links

### **Advanced Filtering**

**Multi-Criteria Filters:**

1. **Use "Advanced Filter"** option
2. **Combine multiple criteria**:
   - Date ranges
   - User roles
   - Location hierarchies
   - Access status
3. **Save frequently used filters**

**Saved Searches:**

1. **Create filter combination**
2. **Click "Save Search"**
3. **Name the saved search**
4. **Access from "Saved Searches" menu**

### **Bulk Operations**

**Bulk User Management:**

1. **Select multiple users** with checkboxes
2. **Choose action** from bulk menu:
   - Change roles
   - Assign/remove locks
   - Export data
   - Send notifications

**Bulk Lock Management:**

1. **Select multiple locks**
2. **Available actions**:
   - Assign users
   - Update settings
   - Generate reports
   - Export configuration

---

## 📱 **Mobile Access**

### **Mobile Browser**

The system is fully responsive and works on mobile devices:

1. **Open mobile browser**
2. **Navigate to system URL**
3. **Login normally**
4. **Mobile-optimized interface** provides:
   - Touch-friendly navigation
   - Simplified layouts
   - Essential features only

### **Mobile App (If Available)**

**Download and Setup:**

1. **Download app** from app store
2. **Enter server URL** during setup
3. **Login with same credentials**
4. **Enable push notifications** for alerts

**Mobile Features:**

- **Quick lock status** check
- **Access log viewing**
- **Emergency notifications**
- **Offline capability** (limited)

---

## 🆘 **Troubleshooting**

### **Common Issues**

**Cannot Login:**

1. **Verify credentials** are correct
2. **Check CAPS LOCK** is off
3. **Ensure correct project/city** selected
4. **Contact administrator** if account is locked

**RFID Card Not Working:**

1. **Check card is assigned** to your account
2. **Verify lock permissions** exist
3. **Clean card** with dry cloth
4. **Try different locks** to isolate issue
5. **Report persistent issues**

**Page Not Loading:**

1. **Refresh the browser**
2. **Clear browser cache**
3. **Check internet connection**
4. **Try different browser**
5. **Contact IT support**

**Access Denied Messages:**

1. **Verify you have permission** for that lock
2. **Check if access** is time-restricted
3. **Ensure account is active**
4. **Contact supervisor** for permission issues

### **Getting Help**

**In-System Help:**

- **Help button** (?) next to features
- **Tooltips** on hover over elements
- **Contextual help** panels

**Contact Support:**

- **Email**: support@yourcompany.com
- **Phone**: Your IT support number
- **Help Desk**: Internal ticketing system
- **Emergency**: Security contact for urgent access issues

**Documentation:**

- **User manual**: This document
- **Quick reference**: Printed cards
- **Video tutorials**: Training materials
- **FAQ**: Frequently asked questions

---

## 📋 **Quick Reference**

### **Keyboard Shortcuts**

- **Ctrl + /**: Open search
- **Ctrl + H**: Go to dashboard
- **Ctrl + L**: Go to locks
- **Ctrl + U**: Go to users (if permitted)
- **Esc**: Close modals/dialogs

### **Status Icons**

- 🟢 **Green**: Available/Active/Success
- 🔴 **Red**: Locked/Inactive/Error
- 🟡 **Yellow**: Warning/Maintenance
- ⚫ **Gray**: Offline/Disabled
- 🔵 **Blue**: Information/Normal

### **Common Tasks**

| Task                    | Steps                                                | Role Required    |
| ----------------------- | ---------------------------------------------------- | ---------------- |
| **Add User**            | Users → Add User → Fill Form → Save                  | ADMIN            |
| **Grant Lock Access**   | Locks → Select Lock → Manage Access → Add User       | ADMIN/SUPERVISOR |
| **View Access History** | Access Logs → Filter → View Results                  | ALL              |
| **Change Password**     | Profile → Change Password → Save                     | ALL              |
| **Generate Report**     | Access Logs → Generate Report → Configure → Download | ADMIN/SUPERVISOR |
| **Add Lock**            | Locks → Add Lock → Fill Details → Save               | ADMIN            |
| **Deactivate User**     | Users → Select User → Edit → Set Inactive → Save     | ADMIN            |

---

## 🔄 **System Updates**

### **Feature Updates**

The system receives regular updates with new features and security enhancements:

- **Automatic updates**: Applied during maintenance windows
- **Security updates**: Critical security patches applied immediately
- **Feature announcements**: Displayed on dashboard
- **Security alerts**: Real-time notifications for security events
- **Training materials**: Updated with new features and security procedures
- **Change logs**: Available in system documentation

### **Maintenance Windows**

- **Scheduled maintenance**: Usually Sunday 2-4 AM
- **Advance notice**: 48-hour notification
- **Emergency maintenance**: As needed with immediate notice
- **Backup access**: Emergency procedures during maintenance

---

**Last Updated:** October 1, 2025  
**Manual Version:** 2.2  
**System Compatibility:** All current versions  
**Security Rating:** 95.9% (Enterprise Grade)

This user manual covers all aspects of the Asset Access Control System. For technical support or additional training, contact your system administrator. 📖✨
