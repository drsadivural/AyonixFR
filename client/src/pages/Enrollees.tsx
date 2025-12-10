import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { Search, Mail, Phone, MapPin, Instagram, Edit, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useLocation } from "wouter";

export default function Enrollees() {
  const [, navigate] = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEnrollee, setSelectedEnrollee] = useState<any>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  
  const [editForm, setEditForm] = useState({
    name: '',
    surname: '',
    email: '',
    phone: '',
    address: '',
    instagram: '',
  });

  const { data: enrollees, isLoading, refetch } = trpc.enrollees.list.useQuery();
  
  const deleteMutation = trpc.enrollees.delete.useMutation({
    onSuccess: () => {
      toast.success('Enrollee deleted successfully');
      setDeleteDialogOpen(false);
      setSelectedEnrollee(null);
      refetch();
    },
    onError: (error) => {
      toast.error(`Failed to delete: ${error.message}`);
    },
  });

  const updateMutation = trpc.enrollees.update.useMutation({
    onSuccess: () => {
      toast.success('Enrollee updated successfully');
      setEditDialogOpen(false);
      setSelectedEnrollee(null);
      refetch();
    },
    onError: (error) => {
      toast.error(`Failed to update: ${error.message}`);
    },
  });

  const filteredEnrollees = enrollees?.filter(e =>
    e.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    e.surname.toLowerCase().includes(searchQuery.toLowerCase()) ||
    e.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const openEditDialog = (enrollee: any) => {
    setSelectedEnrollee(enrollee);
    setEditForm({
      name: enrollee.name,
      surname: enrollee.surname,
      email: enrollee.email || '',
      phone: enrollee.phone || '',
      address: enrollee.address || '',
      instagram: enrollee.instagram || '',
    });
    setEditDialogOpen(true);
  };

  const handleUpdate = () => {
    if (!selectedEnrollee) return;
    updateMutation.mutate({
      id: selectedEnrollee.id,
      ...editForm,
    });
  };

  const handleDelete = () => {
    if (!selectedEnrollee) return;
    deleteMutation.mutate({ id: selectedEnrollee.id });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Enrolled Faces</h1>
          <p className="text-muted-foreground mt-2">
            Manage registered people in the system
          </p>
        </div>
        <Button onClick={() => navigate('/enrollment')}>
          Enroll New Person
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by name, surname, or email..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Grid View */}
      {filteredEnrollees && filteredEnrollees.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredEnrollees.map((enrollee) => (
            <Card key={enrollee.id} className="card-hover cursor-pointer" onClick={() => setSelectedEnrollee(enrollee)}>
              <CardContent className="p-4">
                <div className="aspect-square relative mb-3">
                  <img
                    src={enrollee.thumbnailUrl}
                    alt={`${enrollee.name} ${enrollee.surname}`}
                    className="w-full h-full object-cover rounded-lg"
                  />
                </div>
                <h3 className="font-semibold text-lg">
                  {enrollee.name} {enrollee.surname}
                </h3>
                <p className="text-sm text-muted-foreground">ID: {enrollee.id}</p>
                {enrollee.email && (
                  <p className="text-sm text-muted-foreground truncate mt-1">{enrollee.email}</p>
                )}
                <p className="text-xs text-muted-foreground mt-2">
                  Enrolled: {new Date(enrollee.createdAt).toLocaleDateString()}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <p className="text-muted-foreground text-lg mb-4">No enrollees found</p>
            <Button onClick={() => navigate('/enrollment')}>
              Enroll First Person
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Detail Dialog */}
      <Dialog open={!!selectedEnrollee && !editDialogOpen && !deleteDialogOpen} onOpenChange={(open) => !open && setSelectedEnrollee(null)}>
        <DialogContent className="max-w-2xl">
          {selectedEnrollee && (
            <>
              <DialogHeader>
                <DialogTitle>Enrollee Profile</DialogTitle>
                <DialogDescription>Detailed information and recognition history</DialogDescription>
              </DialogHeader>
              <div className="grid gap-6 md:grid-cols-2">
                <div>
                  <img
                    src={selectedEnrollee.faceImageUrl}
                    alt={`${selectedEnrollee.name} ${selectedEnrollee.surname}`}
                    className="w-full rounded-lg"
                  />
                </div>
                <div className="space-y-4">
                  <div>
                    <h3 className="text-2xl font-bold">
                      {selectedEnrollee.name} {selectedEnrollee.surname}
                    </h3>
                    <p className="text-sm text-muted-foreground">ID: {selectedEnrollee.id}</p>
                  </div>

                  {selectedEnrollee.email && (
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span>{selectedEnrollee.email}</span>
                    </div>
                  )}

                  {selectedEnrollee.phone && (
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span>{selectedEnrollee.phone}</span>
                    </div>
                  )}

                  {selectedEnrollee.address && (
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span>{selectedEnrollee.address}</span>
                    </div>
                  )}

                  {selectedEnrollee.instagram && (
                    <div className="flex items-center gap-2 text-sm">
                      <Instagram className="h-4 w-4 text-muted-foreground" />
                      <span>{selectedEnrollee.instagram}</span>
                    </div>
                  )}

                  <div className="pt-4 border-t">
                    <p className="text-sm text-muted-foreground">
                      Enrolled via: <span className="font-medium">{selectedEnrollee.enrollmentMethod}</span>
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Date: {new Date(selectedEnrollee.createdAt).toLocaleString()}
                    </p>
                  </div>

                  <div className="flex gap-2 pt-4">
                    <Button onClick={() => openEditDialog(selectedEnrollee)} variant="outline" className="flex-1">
                      <Edit className="mr-2 h-4 w-4" />
                      Edit
                    </Button>
                    <Button onClick={() => setDeleteDialogOpen(true)} variant="destructive" className="flex-1">
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </Button>
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Enrollee</DialogTitle>
            <DialogDescription>Update personal information</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Name</Label>
              <Input
                id="edit-name"
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-surname">Surname</Label>
              <Input
                id="edit-surname"
                value={editForm.surname}
                onChange={(e) => setEditForm({ ...editForm, surname: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-email">Email</Label>
              <Input
                id="edit-email"
                type="email"
                value={editForm.email}
                onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-phone">Phone</Label>
              <Input
                id="edit-phone"
                value={editForm.phone}
                onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-address">Address</Label>
              <Input
                id="edit-address"
                value={editForm.address}
                onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-instagram">Instagram</Label>
              <Input
                id="edit-instagram"
                value={editForm.instagram}
                onChange={(e) => setEditForm({ ...editForm, instagram: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleUpdate} disabled={updateMutation.isPending}>
              {updateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this enrollee? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleteMutation.isPending}>
              {deleteMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
