"use client";

import { useState, useEffect, useCallback } from "react";
import DashboardLayout from "@/app/components/layout/DashboardLayout";
import SearchBar from "@/app/components/ui/SearchBar";
import Button from "@/app/components/ui/Button";
import Table, { Column } from "@/app/components/ui/Table";
import Modal from "@/app/components/ui/Modal";
import Input from "@/app/components/ui/Input";
import Alert from "@/app/components/ui/Alert";
import Badge from "@/app/components/ui/Badge";
import LoadingSpinner from "@/app/components/ui/LoadingSpinner";
import {
  getMembers,
  createMember,
  updateMember,
  activateMember,
  deactivateMember,
} from "@/app/lib/api/members-service";
import type { Member, CreateMemberRequest, UpdateMemberRequest } from "@/app/types/library";
import { useRouter } from "next/navigation";

type FilterStatus = "all" | "active" | "inactive";

export default function MembersPage() {
  const router = useRouter();
  const [members, setMembers] = useState<Member[]>([]);
  const [filteredMembers, setFilteredMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [formData, setFormData] = useState<CreateMemberRequest>({
    username: "",
    email: "",
    first_name: "",
    last_name: "",
    phone_number: "",
    address: "",
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const fetchMembers = async () => {
    try {
      setLoading(true);
      setError("");
      const data = await getMembers();
      setMembers(data);
      setFilteredMembers(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch members");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, []);

  useEffect(() => {
    let filtered = members;

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (member) =>
          member.username.toLowerCase().includes(term) ||
          member.email.toLowerCase().includes(term) ||
          member.first_name.toLowerCase().includes(term) ||
          member.last_name.toLowerCase().includes(term)
      );
    }

    if (filterStatus !== "all") {
      filtered = filtered.filter((member) =>
        filterStatus === "active" ? member.is_active : !member.is_active
      );
    }

    setFilteredMembers(filtered);
  }, [members, searchTerm, filterStatus]);

  const handleSearch = useCallback((value: string) => {
    setSearchTerm(value);
  }, []);

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.username.trim()) {
      errors.username = "Username is required";
    }
    if (!formData.email.trim()) {
      errors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = "Invalid email format";
    }
    if (!formData.first_name.trim()) {
      errors.first_name = "First name is required";
    }
    if (!formData.last_name.trim()) {
      errors.last_name = "Last name is required";
    }
    if (!formData.phone_number.trim()) {
      errors.phone_number = "Phone number is required";
    }
    if (!formData.address.trim()) {
      errors.address = "Address is required";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCreate = async () => {
    if (!validateForm()) return;

    try {
      setSubmitting(true);
      setError("");
      await createMember(formData);
      setSuccessMessage("Member registered successfully");
      setIsCreateModalOpen(false);
      resetForm();
      await fetchMembers();
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to register member");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = async () => {
    if (!selectedMember) return;
    if (!validateForm()) return;

    try {
      setSubmitting(true);
      setError("");
      const updateData: UpdateMemberRequest = {
        email: formData.email,
        first_name: formData.first_name,
        last_name: formData.last_name,
        phone_number: formData.phone_number,
        address: formData.address,
      };
      await updateMember(selectedMember.id, updateData);
      setSuccessMessage("Member updated successfully");
      setIsEditModalOpen(false);
      setSelectedMember(null);
      resetForm();
      await fetchMembers();
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update member");
    } finally {
      setSubmitting(false);
    }
  };

  const handleActivate = async (member: Member) => {
    try {
      setError("");
      await activateMember(member.id);
      setSuccessMessage(`Member ${member.username} activated successfully`);
      await fetchMembers();
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to activate member");
    }
  };

  const handleDeactivate = async (member: Member) => {
    if (member.active_borrows_count > 0) {
      setError(`Cannot deactivate ${member.username}: Member has ${member.active_borrows_count} active borrow(s)`);
      return;
    }

    try {
      setError("");
      await deactivateMember(member.id);
      setSuccessMessage(`Member ${member.username} deactivated successfully`);
      await fetchMembers();
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to deactivate member");
    }
  };

  const openCreateModal = () => {
    resetForm();
    setIsCreateModalOpen(true);
  };

  const openEditModal = (member: Member) => {
    setSelectedMember(member);
    setFormData({
      username: member.username,
      email: member.email,
      first_name: member.first_name,
      last_name: member.last_name,
      phone_number: member.phone_number,
      address: member.address,
    });
    setFormErrors({});
    setIsEditModalOpen(true);
  };

  const resetForm = () => {
    setFormData({
      username: "",
      email: "",
      first_name: "",
      last_name: "",
      phone_number: "",
      address: "",
    });
    setFormErrors({});
  };

  const columns: Column<Member>[] = [
    {
      key: "username",
      header: "Username",
      sortable: true,
    },
    {
      key: "email",
      header: "Email",
      sortable: true,
    },
    {
      key: "first_name",
      header: "Name",
      sortable: true,
      render: (member) => `${member.first_name} ${member.last_name}`,
    },
    {
      key: "phone_number",
      header: "Phone",
    },
    {
      key: "active_borrows_count",
      header: "Active Borrows",
      sortable: true,
      render: (member) => (
        <span className={member.active_borrows_count > 0 ? "font-semibold text-blue-600" : ""}>
          {member.active_borrows_count}
        </span>
      ),
    },
    {
      key: "is_active",
      header: "Status",
      sortable: true,
      render: (member) => (
        <Badge variant={member.is_active ? "active" : "inactive"}>
          {member.is_active ? "Active" : "Inactive"}
        </Badge>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      render: (member) => (
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => router.push(`/librarian/members/${member.id}`)}
          >
            View Details
          </Button>
          <Button size="sm" variant="secondary" onClick={() => openEditModal(member)}>
            Edit
          </Button>
          {member.is_active ? (
            <Button
              size="sm"
              variant="danger"
              onClick={() => handleDeactivate(member)}
              disabled={member.active_borrows_count > 0}
            >
              Deactivate
            </Button>
          ) : (
            <Button size="sm" variant="primary" onClick={() => handleActivate(member)}>
              Activate
            </Button>
          )}
        </div>
      ),
    },
  ];

  if (loading) {
    return (
      <DashboardLayout>
        <LoadingSpinner text="Loading members..." />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">Members Management</h1>
          <Button onClick={openCreateModal}>Register New Member</Button>
        </div>

        {error && (
          <Alert variant="error" dismissible onDismiss={() => setError("")}>
            {error}
          </Alert>
        )}

        {successMessage && (
          <Alert variant="success" dismissible onDismiss={() => setSuccessMessage("")}>
            {successMessage}
          </Alert>
        )}

        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
          <SearchBar
            onSearch={handleSearch}
            placeholder="Search by username, email, or name..."
            className="w-full sm:flex-1"
          />

          <div className="flex gap-2">
            <Button
              variant={filterStatus === "all" ? "primary" : "secondary"}
              size="sm"
              onClick={() => setFilterStatus("all")}
            >
              All
            </Button>
            <Button
              variant={filterStatus === "active" ? "primary" : "secondary"}
              size="sm"
              onClick={() => setFilterStatus("active")}
            >
              Active
            </Button>
            <Button
              variant={filterStatus === "inactive" ? "primary" : "secondary"}
              size="sm"
              onClick={() => setFilterStatus("inactive")}
            >
              Inactive
            </Button>
          </div>
        </div>

        <Table
          columns={columns}
          data={filteredMembers}
          keyExtractor={(member) => member.id}
          emptyMessage="No members found"
        />

        <Modal
          isOpen={isCreateModalOpen}
          onClose={() => {
            setIsCreateModalOpen(false);
            resetForm();
          }}
          title="Register New Member"
          size="lg"
          footer={
            <>
              <Button
                variant="secondary"
                onClick={() => {
                  setIsCreateModalOpen(false);
                  resetForm();
                }}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button onClick={handleCreate} loading={submitting}>
                Register Member
              </Button>
            </>
          }
        >
          <div className="space-y-4">
            <Input
              label="Username"
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              error={formErrors.username}
              required
            />
            <Input
              label="Email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              error={formErrors.email}
              required
            />
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="First Name"
                value={formData.first_name}
                onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                error={formErrors.first_name}
                required
              />
              <Input
                label="Last Name"
                value={formData.last_name}
                onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                error={formErrors.last_name}
                required
              />
            </div>
            <Input
              label="Phone Number"
              value={formData.phone_number}
              onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
              error={formErrors.phone_number}
              required
            />
            <Input
              label="Address"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              error={formErrors.address}
              required
            />
          </div>
        </Modal>

        <Modal
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            setSelectedMember(null);
            resetForm();
          }}
          title="Edit Member"
          size="lg"
          footer={
            <>
              <Button
                variant="secondary"
                onClick={() => {
                  setIsEditModalOpen(false);
                  setSelectedMember(null);
                  resetForm();
                }}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button onClick={handleEdit} loading={submitting}>
                Update Member
              </Button>
            </>
          }
        >
          <div className="space-y-4">
            <Input
              label="Username"
              value={formData.username}
              disabled
              className="bg-gray-100"
            />
            <Input
              label="Email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              error={formErrors.email}
              required
            />
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="First Name"
                value={formData.first_name}
                onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                error={formErrors.first_name}
                required
              />
              <Input
                label="Last Name"
                value={formData.last_name}
                onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                error={formErrors.last_name}
                required
              />
            </div>
            <Input
              label="Phone Number"
              value={formData.phone_number}
              onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
              error={formErrors.phone_number}
              required
            />
            <Input
              label="Address"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              error={formErrors.address}
              required
            />
          </div>
        </Modal>
      </div>
    </DashboardLayout>
  );
}
