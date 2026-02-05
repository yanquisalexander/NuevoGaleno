import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
    UserPlus,
    Users,
    Shield,
    Trash2,
    Key,
    CheckCircle2,
    XCircle,
    AlertTriangle,
    Edit,
    Loader2,
} from 'lucide-react';
import { useToast } from '@/hooks/useToast';
import { cn } from '@/lib/utils';

interface User {
    id: number;
    username: string;
    name: string;
    role: string;
    active: boolean;
    created_at: string;
    pin: string | null;
}

const ROLES = [
    { value: 'admin', label: 'Administrador', description: 'Acceso completo al sistema' },
    { value: 'doctor', label: 'Doctor', description: 'Gestión de pacientes y tratamientos' },
    { value: 'assistant', label: 'Asistente', description: 'Consulta y soporte administrativo' },
];

export function UserManagementPanel() {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreateDialog, setShowCreateDialog] = useState(false);
    const [showPasswordDialog, setShowPasswordDialog] = useState(false);
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [processing, setProcessing] = useState(false);
    const toast = useToast();

    // Form states
    const [formData, setFormData] = useState({
        username: '',
        name: '',
        password: '',
        confirmPassword: '',
        role: 'doctor' as string,
    });

    const loadUsers = async () => {
        try {
            setLoading(true);
            const userList = await invoke<User[]>('list_users');
            setUsers(userList);
        } catch (error) {
            console.error('Error loading users:', error);
            toast.error('Error', 'No se pudieron cargar los usuarios');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadUsers();
    }, []);

    const handleCreateUser = async () => {
        if (!formData.username || !formData.name || !formData.password) {
            toast.error('Error', 'Por favor completa todos los campos');
            return;
        }

        if (formData.password !== formData.confirmPassword) {
            toast.error('Error', 'Las contraseñas no coinciden');
            return;
        }

        if (formData.password.length < 4) {
            toast.error('Error', 'La contraseña debe tener al menos 4 caracteres');
            return;
        }

        try {
            setProcessing(true);

            // Hashear la contraseña con SHA-256
            const pwBuffer = new TextEncoder().encode(formData.password);
            const hashBuf = await crypto.subtle.digest('SHA-256', pwBuffer);
            const hashHex = Array.from(new Uint8Array(hashBuf))
                .map((b) => b.toString(16).padStart(2, '0'))
                .join('');

            await invoke('create_user', {
                username: formData.username,
                passwordHash: hashHex,
                name: formData.name,
                role: formData.role,
            });

            toast.success('Usuario creado', `${formData.name} ha sido agregado correctamente`);
            setShowCreateDialog(false);
            resetForm();
            await loadUsers();
        } catch (error: any) {
            toast.error('Error', error.toString());
        } finally {
            setProcessing(false);
        }
    };

    const handleUpdatePassword = async () => {
        if (!selectedUser) return;

        if (!formData.password || formData.password !== formData.confirmPassword) {
            toast.error('Error', 'Las contraseñas no coinciden');
            return;
        }

        if (formData.password.length < 4) {
            toast.error('Error', 'La contraseña debe tener al menos 4 caracteres');
            return;
        }

        try {
            setProcessing(true);

            // Hashear la contraseña con SHA-256
            const pwBuffer = new TextEncoder().encode(formData.password);
            const hashBuf = await crypto.subtle.digest('SHA-256', pwBuffer);
            const hashHex = Array.from(new Uint8Array(hashBuf))
                .map((b) => b.toString(16).padStart(2, '0'))
                .join('');

            await invoke('update_user_password', {
                username: selectedUser.username,
                newPasswordHash: hashHex,
            });

            toast.success('Contraseña actualizada', 'La contraseña se ha cambiado correctamente');
            setShowPasswordDialog(false);
            resetForm();
        } catch (error: any) {
            toast.error('Error', error.toString());
        } finally {
            setProcessing(false);
        }
    };

    const handleDeleteUser = async () => {
        if (!selectedUser) return;

        try {
            setProcessing(true);
            await invoke('delete_user', {
                username: selectedUser.username,
            });

            toast.success('Usuario eliminado', `${selectedUser.name} ha sido eliminado del sistema`);
            setShowDeleteDialog(false);
            setSelectedUser(null);
            await loadUsers();
        } catch (error: any) {
            toast.error('Error', error.toString());
        } finally {
            setProcessing(false);
        }
    };

    const resetForm = () => {
        setFormData({
            username: '',
            name: '',
            password: '',
            confirmPassword: '',
            role: 'doctor',
        });
        setSelectedUser(null);
    };

    const getRoleBadge = (role: string) => {
        const roleConfig = ROLES.find((r) => r.value === role);
        const colors = {
            admin: 'bg-red-500/10 text-red-400 border-red-500/20',
            doctor: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
            assistant: 'bg-green-500/10 text-green-400 border-green-500/20',
        };

        return (
            <span
                className={cn(
                    'px-2 py-1 text-xs font-medium rounded border',
                    colors[role as keyof typeof colors] || 'bg-gray-500/10 text-gray-400 border-gray-500/20'
                )}
            >
                {roleConfig?.label || role}
            </span>
        );
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-semibold text-white">Usuarios del Sistema</h2>
                    <p className="text-white/50 text-sm mt-1">
                        Gestiona los usuarios que tienen acceso a Nuevo Galeno
                    </p>
                </div>
                <Button
                    onClick={() => setShowCreateDialog(true)}
                    className="bg-[#005FB8] hover:bg-[#005FB8]/90 text-white"
                >
                    <UserPlus className="w-4 h-4 mr-2" />
                    Nuevo Usuario
                </Button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="bg-[#272727] border-white/5">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium text-white/70 flex items-center gap-2">
                            <Users className="w-4 h-4" />
                            Total de Usuarios
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-3xl font-bold text-white">{users.length}</p>
                    </CardContent>
                </Card>

                <Card className="bg-[#272727] border-white/5">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium text-white/70 flex items-center gap-2">
                            <Shield className="w-4 h-4" />
                            Administradores
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-3xl font-bold text-white">
                            {users.filter((u) => u.role === 'admin').length}
                        </p>
                    </CardContent>
                </Card>

                <Card className="bg-[#272727] border-white/5">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium text-white/70 flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4" />
                            Usuarios Activos
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-3xl font-bold text-white">
                            {users.filter((u) => u.active).length}
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Users List */}
            <Card className="bg-[#272727] border-white/5">
                <CardHeader>
                    <CardTitle className="text-white">Lista de Usuarios</CardTitle>
                    <CardDescription className="text-white/50">
                        Gestiona permisos y credenciales de acceso
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-2">
                        {users.map((user) => (
                            <div
                                key={user.id}
                                className="flex items-center justify-between p-4 bg-[#202020]/50 rounded-lg border border-white/5 hover:bg-[#202020]/80 transition-colors"
                            >
                                <div className="flex items-center gap-4 flex-1">
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white font-semibold">
                                        {user.name.charAt(0).toUpperCase()}
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2">
                                            <h3 className="text-white font-medium">{user.name}</h3>
                                            {getRoleBadge(user.role)}
                                        </div>
                                        <p className="text-white/40 text-sm">@{user.username}</p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => {
                                            setSelectedUser(user);
                                            setShowPasswordDialog(true);
                                        }}
                                        className="text-white/70 hover:text-white hover:bg-white/10"
                                    >
                                        <Key className="w-4 h-4 mr-1" />
                                        Cambiar contraseña
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => {
                                            setSelectedUser(user);
                                            setShowDeleteDialog(true);
                                        }}
                                        className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>
                        ))}

                        {users.length === 0 && (
                            <div className="text-center py-12">
                                <Users className="w-12 h-12 text-white/20 mx-auto mb-4" />
                                <p className="text-white/40">No hay usuarios registrados</p>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Create User Dialog */}
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                <DialogContent className="bg-[#202020] border-white/10 text-white">
                    <DialogHeader>
                        <DialogTitle>Crear Nuevo Usuario</DialogTitle>
                        <DialogDescription className="text-white/60">
                            Agrega un nuevo usuario al sistema con sus credenciales de acceso
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="name" className="text-white/80">
                                Nombre completo
                            </Label>
                            <Input
                                id="name"
                                placeholder="Ej: Dr. Juan Pérez"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                className="bg-[#333] border-white/10 text-white"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="username" className="text-white/80">
                                Nombre de usuario
                            </Label>
                            <Input
                                id="username"
                                placeholder="Ej: jperez"
                                value={formData.username}
                                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                className="bg-[#333] border-white/10 text-white"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="role" className="text-white/80">
                                Rol
                            </Label>
                            <Select value={formData.role} onValueChange={(value) => setFormData({ ...formData, role: value })}>
                                <SelectTrigger className="bg-[#333] border-white/10 text-white">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-[#2c2c2c] border-white/10">
                                    {ROLES.map((role) => (
                                        <SelectItem key={role.value} value={role.value} className="text-white">
                                            <div className="flex flex-col">
                                                <span className="font-medium">{role.label}</span>
                                                <span className="text-xs text-white/50">{role.description}</span>
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="password" className="text-white/80">
                                Contraseña
                            </Label>
                            <Input
                                id="password"
                                type="password"
                                placeholder="Mínimo 4 caracteres"
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                className="bg-[#333] border-white/10 text-white"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="confirmPassword" className="text-white/80">
                                Confirmar contraseña
                            </Label>
                            <Input
                                id="confirmPassword"
                                type="password"
                                placeholder="Repite la contraseña"
                                value={formData.confirmPassword}
                                onChange={(e) =>
                                    setFormData({ ...formData, confirmPassword: e.target.value })
                                }
                                className="bg-[#333] border-white/10 text-white"
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => {
                                setShowCreateDialog(false);
                                resetForm();
                            }}
                            disabled={processing}
                            className="bg-[#333] border-white/10 text-white hover:bg-[#3d3d3d]"
                        >
                            Cancelar
                        </Button>
                        <Button
                            onClick={handleCreateUser}
                            disabled={processing}
                            className="bg-[#005FB8] hover:bg-[#005FB8]/90 text-white"
                        >
                            {processing ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Creando...
                                </>
                            ) : (
                                'Crear Usuario'
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Change Password Dialog */}
            <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
                <DialogContent className="bg-[#202020] border-white/10 text-white">
                    <DialogHeader>
                        <DialogTitle>Cambiar Contraseña</DialogTitle>
                        <DialogDescription className="text-white/60">
                            Actualiza la contraseña de {selectedUser?.name}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="newPassword" className="text-white/80">
                                Nueva contraseña
                            </Label>
                            <Input
                                id="newPassword"
                                type="password"
                                placeholder="Mínimo 4 caracteres"
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                className="bg-[#333] border-white/10 text-white"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="confirmNewPassword" className="text-white/80">
                                Confirmar nueva contraseña
                            </Label>
                            <Input
                                id="confirmNewPassword"
                                type="password"
                                placeholder="Repite la contraseña"
                                value={formData.confirmPassword}
                                onChange={(e) =>
                                    setFormData({ ...formData, confirmPassword: e.target.value })
                                }
                                className="bg-[#333] border-white/10 text-white"
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => {
                                setShowPasswordDialog(false);
                                resetForm();
                            }}
                            disabled={processing}
                            className="bg-[#333] border-white/10 text-white hover:bg-[#3d3d3d]"
                        >
                            Cancelar
                        </Button>
                        <Button
                            onClick={handleUpdatePassword}
                            disabled={processing}
                            className="bg-[#005FB8] hover:bg-[#005FB8]/90 text-white"
                        >
                            {processing ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Actualizando...
                                </>
                            ) : (
                                'Actualizar Contraseña'
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete User Dialog */}
            <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <AlertDialogContent className="bg-[#202020] border-white/10 text-white">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-white">¿Eliminar usuario?</AlertDialogTitle>
                        <AlertDialogDescription className="text-white/60">
                            Esta acción no se puede deshacer. El usuario {selectedUser?.name} será eliminado
                            permanentemente del sistema.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel className="bg-[#333] border-white/10 text-white hover:bg-[#3d3d3d]">
                            Cancelar
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDeleteUser}
                            disabled={processing}
                            className="bg-red-600 hover:bg-red-700 text-white"
                        >
                            {processing ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Eliminando...
                                </>
                            ) : (
                                'Eliminar'
                            )}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
