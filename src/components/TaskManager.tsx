import React from 'react';
import { runtimeManager } from '../hooks/useAppRuntime';
import { Button } from './ui/button'; // Assuming there's a button component
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table'; // Assuming table components

export const TaskManager: React.FC = () => {
    const [apps, setApps] = React.useState(runtimeManager.getAll());

    const refresh = () => {
        setApps(runtimeManager.getAll());
    };

    const handleKill = (appId: string) => {
        runtimeManager.kill(appId);
        refresh();
    };

    const handleFreeze = (appId: string) => {
        runtimeManager.freeze(appId);
        refresh();
    };

    const handleResume = (appId: string) => {
        runtimeManager.resume(appId);
        refresh();
    };

    return (
        <div className="p-4">
            <h1>Task Manager</h1>
            <Button onClick={refresh}>Refresh</Button>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>App</TableHead>
                        <TableHead>CPU (%)</TableHead>
                        <TableHead>RAM (MB)</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {apps.map((app) => (
                        <TableRow key={app.id}>
                            <TableCell>{app.name}</TableCell>
                            <TableCell>{app.cpu.toFixed(2)}</TableCell>
                            <TableCell>{app.ram.toFixed(2)}</TableCell>
                            <TableCell>{app.status}</TableCell>
                            <TableCell>
                                <Button onClick={() => handleKill(app.id)}>Kill</Button>
                                <Button onClick={() => handleFreeze(app.id)}>Freeze</Button>
                                <Button onClick={() => handleResume(app.id)}>Resume</Button>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
};