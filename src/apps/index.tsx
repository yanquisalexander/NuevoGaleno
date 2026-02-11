import { TaskManager } from '../components/TaskManager';
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
import { TreatmentCatalogApp } from './TreatmentCatalog';
import { MiGalenoApp } from './MiGaleno';
import { NodeConfigApp } from './NodeConfig';
import { ManualGalenoApp } from './ManualGaleno';
import { DevToolsApp } from './DevTools';
import { PeopleListColor, SettingsColor, CalendarColor, DocumentFolderColor } from '@fluentui/react-icons';

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
export { TreatmentCatalogApp } from './TreatmentCatalog';
export { MiGalenoApp } from './MiGaleno';
export { NodeConfigApp } from './NodeConfig';
export { ManualGalenoApp } from './ManualGaleno';
export { DevToolsApp } from './DevTools';

// Export app definitions
export const APP_DEFINITIONS = [
    {
        id: 'initial-setup',
        name: 'Configuración Inicial',
        icon: '🔧',
        allowMultipleInstances: false,
        defaultSize: { width: 800, height: 600 },
        showOnDesktop: false,
        component: InitialSetupApp,
    },
    {
        id: 'dashboard',
        name: 'Panel de Control',
        icon: '🏠',
        allowMultipleInstances: false,
        defaultSize: { width: 800, height: 600 },
        component: DashboardApp,
    },
    {
        id: 'patients',
        name: 'Pacientes',
        icon: '👥',
        iconComponent: PeopleListColor,
        allowMultipleInstances: false,
        defaultSize: { width: 800, height: 600 },
        component: PatientsApp,
    },
    {
        id: 'patient-record',
        name: 'Ficha de Paciente',
        icon: '👤',
        allowMultipleInstances: true,
        defaultSize: { width: 800, height: 600 },
        component: PatientRecordApp,
        showOnDesktop: false,
    },
    {
        id: 'treatments',
        name: 'Tratamientos',
        icon: '🦷',
        allowMultipleInstances: true,
        defaultSize: { width: 800, height: 600 },
        component: TreatmentsApp,
        showOnDesktop: false,
    },
    {
        id: 'accounts',
        name: 'Cuentas Corrientes',
        icon: '💰',
        allowMultipleInstances: false,
        defaultSize: { width: 800, height: 600 },
        component: AccountsApp,
    },
    {
        id: 'treatment-catalog',
        name: 'Catálogo de Tratamientos',
        icon: '📋',
        iconComponent: DocumentFolderColor,
        allowMultipleInstances: false,
        defaultSize: { width: 800, height: 600 },
        component: TreatmentCatalogApp,
    },
    {
        id: 'appointments',
        name: 'Agenda de Citas',
        icon: '📅',
        iconComponent: CalendarColor,
        allowMultipleInstances: false,
        defaultSize: { width: 800, height: 600 },
        component: AppointmentsApp,
    },
    {
        id: 'settings',
        name: 'Configuración',
        icon: '⚙️',
        iconComponent: SettingsColor,
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
        defaultSize: { width: 800, height: 600 },
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
    {
        id: 'migaleno',
        name: 'MiGaleno',
        icon: '🛡️',
        allowMultipleInstances: false,
        defaultSize: { width: 960, height: 600 },
        component: MiGalenoApp,
        requiresAdmin: true,
    },
    {
        id: 'node-config',
        name: 'Configuración Multi-Nodo',
        icon: '🌐',
        allowMultipleInstances: false,
        defaultSize: { width: 800, height: 600 },
        component: NodeConfigApp,
        showOnDesktop: false,
    },
    {
        id: 'task-manager',
        name: 'Task Manager',
        icon: '⚙️',
        allowMultipleInstances: false,
        defaultSize: { width: 800, height: 600 },
        component: TaskManager,
        showOnDesktop: false,
    },
    {
        id: 'manual-galeno',
        name: 'Manual Galeno',
        icon: '📖',
        allowMultipleInstances: false,
        defaultSize: { width: 800, height: 600 },
        component: ManualGalenoApp,
    },
    {
        id: 'dev-tools',
        name: 'DEV Tools',
        icon: '🛠️',
        allowMultipleInstances: false,
        defaultSize: { width: 800, height: 600 },
        component: DevToolsApp,
        showOnDesktop: false,
    },
];
