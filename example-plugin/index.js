// Hello World Plugin for Nuevo Galeno
// This is a simple example plugin

let context = null;

export async function activate(pluginContext) {
    context = pluginContext;

    console.log(`${context.plugin.name} v${context.plugin.version} activated!`);

    // Show welcome notification
    context.api.ui.showNotification(
        'Hello World Plugin está listo!',
        'success'
    );

    // Register event listeners
    context.hooks.on('patient:open', handlePatientOpen);
}

export async function deactivate() {
    console.log('Hello World Plugin deactivated');

    // Clean up event listeners
    if (context) {
        context.hooks.off('patient:open', handlePatientOpen);
    }
}

function handlePatientOpen(patient) {
    console.log('Patient opened:', patient);

    context.api.ui.showNotification(
        `Hola ${patient.name}!`,
        'info'
    );
}

// Main window action
export async function openMainWindow() {
    if (!context) return;

    // This would normally open a window with a React component
    // For now, just show a notification
    context.api.ui.showNotification(
        'Hello World Plugin window would open here!',
        'info'
    );
}
