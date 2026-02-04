import {
    DashboardApp,
    PatientsApp,
    PatientRecordApp,
    TreatmentsApp,
    AccountsApp,
    MaintenanceApp,
    BackToWindowsApp,
    InitialSetupApp,
    ImportReviewApp
} from './';

import { UserAccountsApp } from './UserAccounts';
import { ConfigurationApp } from '@/components/ConfigurationApp';
import AppointmentsApp from './Appointments';
import { GalenoUpdateApp } from './GalenoUpdate';

export { DashboardApp } from './Dashboard';
export { PatientsApp } from './Patients';
export { PatientRecordApp } from './PatientRecord';
export { TreatmentsApp } from './Treatments';
export { AccountsApp } from './Accounts';
export { MaintenanceApp } from './Maintenance';
export { BackToWindowsApp, InitialSetupApp, ImportReviewApp } from './System';
export { ConfigurationApp };
export { AppointmentsApp };
export { GalenoUpdateApp } from './GalenoUpdate';
export { UserAccountsApp } from './UserAccounts';

// Export app definitions
export const APP_DEFINITIONS = [
    {
        id: 'initial-setup',
        name: 'Configuración Inicial',
        icon: '🔧',
        allowMultipleInstances: false,
        defaultSize: { width: 900, height: 650 },
        showOnDesktop: false,
        component: InitialSetupApp,
    },
    {
        id: 'dashboard',
        name: 'Panel de Control',
        icon: '🏠',
        allowMultipleInstances: false,
        defaultSize: { width: 1100, height: 700 },
        component: DashboardApp,
    },
    {
        id: 'patients',
        name: 'Pacientes',
        icon: '👥',
        allowMultipleInstances: false,
        defaultSize: { width: 1000, height: 700 },
        component: PatientsApp,
    },
    {
        id: 'patient-record',
        name: 'Ficha de Paciente',
        icon: '👤',
        allowMultipleInstances: true,
        defaultSize: { width: 900, height: 750 },
        component: PatientRecordApp,
        showOnDesktop: false,
    },
    {
        id: 'treatments',
        name: 'Tratamientos',
        icon: '🦷',
        allowMultipleInstances: true,
        defaultSize: { width: 900, height: 700 },
        component: TreatmentsApp,
        showOnDesktop: false,
    },
    {
        id: 'accounts',
        name: 'Cuentas Corrientes',
        icon: '💰',
        allowMultipleInstances: false,
        defaultSize: { width: 900, height: 700 },
        component: AccountsApp,
    },
    {
        id: 'appointments',
        name: 'Agenda de Citas',
        icon: '📅',
        allowMultipleInstances: false,
        defaultSize: { width: 1200, height: 800 },
        component: AppointmentsApp,
    },
    {
        id: 'settings',
        name: 'Configuración',
        icon: '⚙️',
        allowMultipleInstances: false,
        defaultSize: { width: 900, height: 650 },
        component: ConfigurationApp,
    },
    {
        id: 'user-profile',
        name: 'Tu Cuenta',
        icon: '👤',
        allowMultipleInstances: false,
        defaultSize: { width: 850, height: 650 },
        component: UserAccountsApp,
    },
    {
        id: 'system-tools',
        name: 'Mantenimiento',
        icon: '🧰',
        allowMultipleInstances: false,
        defaultSize: { width: 800, height: 600 },
        component: MaintenanceApp,
        showOnDesktop: false,
    },
    {
        id: 'back-to-windows',
        name: 'Volver a Windows',
        icon: '🪟',
        allowMultipleInstances: false,
        defaultSize: { width: 1, height: 1 },
        component: BackToWindowsApp,
    },
    {
        id: 'import-review',
        name: 'Revisión de Importación',
        icon: '📊',
        allowMultipleInstances: false,
        defaultSize: { width: 1200, height: 800 },
        showOnDesktop: false,
        component: ImportReviewApp,
    },
    {
        id: 'galeno-update',
        name: 'Galeno Update',
        icon: '⚡',
        allowMultipleInstances: false,
        defaultSize: { width: 800, height: 600 },
        showOnDesktop: false,
        component: GalenoUpdateApp,
    },
];
