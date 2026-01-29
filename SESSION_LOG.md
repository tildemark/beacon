
# Project BEACON – Session Log

- Initial scaffold: Edge (Python), Cloud (Next.js/Prisma), Docker, .env
- Edge: Harvester and Syncer modules, robust error handling, deduplication
- Cloud: Prisma schema for BeaconNode, AttendanceLog; API for sync (GZIP, Bearer auth)
- Frontend: NodeFleetGrid (IT/Admin), AttendanceTable (HR)
- Added employee login and dashboard (User model, authentication, EmployeeDashboard)
- Added InvalidLogRequest and ManualLogRequest models for employee self-service
- Added HR import/add employee and schedule management features (API, UI, DB)
- Added manual attendance upload for offline/incompatible sites (CSV/Excel or form)
- **Added Office Mode:** LAN-based, Pi-less deployment for HQ/branch offices (BEACON_MODE=OFFICE)
- Documented project flow and onboarding for new developers
- Added PowerShell easy-install script (`easy-install.ps1`) for Windows/Office users
- Standardized on using `.venv` for Python virtual environments in all documentation and onboarding
- Enhanced `test_device.py` to provide full device diagnostics and robust error handling for pyzk/device limitations.

## Major Milestones & Design Decisions
- Initial scaffold: Edge (Python), Cloud (Next.js/Prisma), Docker, .env
- Edge: Harvester and Syncer modules, robust error handling, deduplication
- Cloud: Prisma schema for BeaconNode, AttendanceLog; API for sync (GZIP, Bearer auth)
- Frontend: NodeFleetGrid (IT/Admin), AttendanceTable (HR)
- Added employee login and dashboard (User model, authentication, EmployeeDashboard)
- Added InvalidLogRequest and ManualLogRequest models for employee self-service
- Added HR import/add employee and schedule management features (API, UI, DB)
- Added manual attendance upload for offline/incompatible sites (CSV/Excel or form)
- **Office Mode:** LAN-based, Pi-less deployment for HQ/branch offices (BEACON_MODE=OFFICE)
- Documented project flow and onboarding for new developers
- **Documentation Review (2026-01-29):** Comprehensive review and cleanup of all documentation files
  - Removed duplicate content from ai-prompt.md, README.md, and PROJECT_FLOW.md
  - Added OFFICE Mode documentation throughout
  - Added feature status tables and API endpoint documentation
  - Clarified implemented vs. planned features
  - Updated file structure to reflect actual implementation

## AI Prompt Updates
- Added support for employee login, invalid log requests, and manual log submissions with proof
- Updated project flow documentation to reflect new features
- **Added Office Mode as a supported deployment.**
- **Comprehensive documentation cleanup and feature status clarification**

## Next Steps
- Implement authentication (NextAuth.js or custom)
- Implement employee dashboard and request forms
- Build review/approval flows for HR/IT
- Implement HR employee management UI (import/add/edit)
- Implement schedule management UI
- Implement manual attendance upload UI
- Add Schedule model to schema or document alternative approach
