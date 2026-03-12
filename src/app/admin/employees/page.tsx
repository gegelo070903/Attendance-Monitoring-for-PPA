"use client";

import { useEffect, useState, useRef } from "react";
import { User } from "@/types";
import { useToast } from "@/components/Toast";
import QRCode from "qrcode";

// Eye icons as inline SVG components
const EyeIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

const EyeSlashIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
  </svg>
);

export default function EmployeesPage() {
  const { showSuccess, showError } = useToast();
  const [employees, setEmployees] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<User | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showEditPassword, setShowEditPassword] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    role: "EMPLOYEE",
    department: "",
    position: "",
  });
  const [editFormData, setEditFormData] = useState({
    id: "",
    name: "",
    email: "",
    password: "",
    role: "EMPLOYEE",
    department: "",
    position: "",
  });
  const [error, setError] = useState("");
  const [editError, setEditError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [qrEmployee, setQrEmployee] = useState<User | null>(null);
  const [idCardEmployee, setIdCardEmployee] = useState<User | null>(null);
  const qrCanvasRef = useRef<HTMLCanvasElement>(null);
  const editFileInputRef = useRef<HTMLInputElement>(null);
  const [editProfilePreview, setEditProfilePreview] = useState<string | null>(null);
  const [editProfileFile, setEditProfileFile] = useState<File | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const fetchEmployees = async () => {
    try {
      const response = await fetch("/api/employees", {
        method: 'GET',
        credentials: 'include',
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
          'Content-Type': 'application/json',
        },
      });
      const data = await response.json();
      
      console.log("Fetch response:", response.status, data);
      
      // Check if response was successful
      if (!response.ok) {
        console.error("API Error:", response.status, data);
        setEmployees([]);
        return;
      }
      
      // Ensure data is an array before setting state
      if (Array.isArray(data)) {
        console.log("Setting employees:", data.length);
        setEmployees(data);
      } else {
        console.error("Invalid employees data:", data);
        setEmployees([]);
      }
    } catch (error) {
      console.error("Failed to fetch employees:", error);
      setEmployees([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      const response = await fetch("/api/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to create employee");
        showError(data.error || "Failed to create employee");
      } else {
        showSuccess(`Employee ${formData.name} created successfully!`);
        setShowModal(false);
        setFormData({
          name: "",
          email: "",
          password: "",
          role: "EMPLOYEE",
          department: "",
          position: "",
        });
        fetchEmployees();
      }
    } catch (err) {
      setError("An unexpected error occurred");
      showError("An unexpected error occurred");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setEditError("");

    try {
      const updateData: any = {
        id: editFormData.id,
        name: editFormData.name,
        email: editFormData.email,
        department: editFormData.department,
        position: editFormData.position,
        role: editFormData.role,
      };

      if (editFormData.password) {
        updateData.password = editFormData.password;
      }

      const response = await fetch("/api/employees", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updateData),
      });

      const data = await response.json();

      if (!response.ok) {
        setEditError(data.error || "Failed to update employee");
        showError(data.error || "Failed to update employee");
      } else {
        // Upload profile photo if one was selected
        if (editProfileFile) {
          await uploadProfilePhoto(editFormData.id);
        }
        showSuccess(`Employee ${editFormData.name} updated successfully!`);
        setShowEditModal(false);
        setEditingEmployee(null);
        setEditProfilePreview(null);
        setEditProfileFile(null);
        fetchEmployees();
      }
    } catch (err) {
      setEditError("An unexpected error occurred");
      showError("An unexpected error occurred");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (employee: User) => {
    setEditingEmployee(employee);
    setEditFormData({
      id: employee.id,
      name: employee.name,
      email: employee.email,
      password: "",
      role: employee.role,
      department: employee.department || "",
      position: employee.position || "",
    });
    setEditError("");
    setEditProfilePreview(null);
    setEditProfileFile(null);
    setShowEditModal(true);
  };

  const handleEditProfileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const validTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!validTypes.includes(file.type)) {
      showError("Please select a JPEG, PNG, or WebP image");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      showError("Image must be less than 5MB");
      return;
    }
    setEditProfileFile(file);
    setEditProfilePreview(URL.createObjectURL(file));
  };

  const uploadProfilePhoto = async (userId: string): Promise<boolean> => {
    if (!editProfileFile) return true;
    setUploadingPhoto(true);
    try {
      const formData = new FormData();
      formData.append("image", editProfileFile);
      formData.append("userId", userId);
      const res = await fetch("/api/profile/upload", { method: "POST", body: formData });
      if (!res.ok) {
        const data = await res.json();
        showError(data.error || "Failed to upload photo");
        return false;
      }
      return true;
    } catch {
      showError("Failed to upload photo");
      return false;
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this employee?")) return;

    try {
      const response = await fetch(`/api/employees?id=${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        showSuccess("Employee deleted successfully!");
        fetchEmployees();
      } else {
        showError("Failed to delete employee");
      }
    } catch (error) {
      console.error("Failed to delete employee:", error);
      showError("Failed to delete employee");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Employees</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">Manage employee accounts</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="px-3 py-1.5 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors flex items-center gap-1.5 shadow-md"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M18 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0ZM3 19.235v-.11a6.375 6.375 0 0 1 12.75 0v.109A12.318 12.318 0 0 1 9.374 21c-2.331 0-4.512-.645-6.374-1.766Z"
            />
          </svg>
          Add Employee
        </button>
      </div>

      {/* Employees Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="text-left py-2.5 px-4 text-xs font-semibold text-gray-600 dark:text-gray-300">
                  Name
                </th>
                <th className="text-left py-2.5 px-4 text-xs font-semibold text-gray-600 dark:text-gray-300">
                  Email
                </th>
                <th className="text-left py-2.5 px-4 text-xs font-semibold text-gray-600 dark:text-gray-300">
                  Department
                </th>
                <th className="text-left py-2.5 px-4 text-xs font-semibold text-gray-600 dark:text-gray-300">
                  Position
                </th>
                <th className="text-left py-2.5 px-4 text-xs font-semibold text-gray-600 dark:text-gray-300">
                  Role
                </th>
                <th className="text-left py-2.5 px-4 text-xs font-semibold text-gray-600 dark:text-gray-300">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {employees.map((employee) => (
                <tr
                  key={employee.id}
                  className="border-t border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm"
                >
                  <td className="py-2.5 px-4">
                    <div className="flex items-center gap-2">
                      {employee.profileImage ? (
                        <img
                          src={employee.profileImage}
                          alt={employee.name}
                          className="w-8 h-8 rounded-full object-cover border border-gray-200 dark:border-gray-600"
                        />
                      ) : (
                        <div className="w-8 h-8 bg-primary-100 dark:bg-ppa-navy/30 rounded-full flex items-center justify-center">
                          <span className="text-primary-700 dark:text-blue-300 font-semibold text-xs">
                            {employee.name.charAt(0)}
                          </span>
                        </div>
                      )}
                      <span className="font-medium text-gray-900 dark:text-gray-100">
                        {employee.name}
                      </span>
                    </div>
                  </td>
                  <td className="py-2.5 px-4 text-gray-600 dark:text-gray-300">{employee.email}</td>
                  <td className="py-2.5 px-4 text-gray-600 dark:text-gray-300">
                    {employee.department || "-"}
                  </td>
                  <td className="py-2.5 px-4 text-gray-600 dark:text-gray-300">
                    {employee.position || "-"}
                  </td>
                  <td className="py-2.5 px-4">
                    <span
                      className={`inline-flex px-2 py-0.5 text-[10px] font-medium rounded-full ${
                        employee.role === "ADMIN"
                          ? "bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300"
                          : "bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300"
                      }`}
                    >
                      {employee.role}
                    </span>
                  </td>
                  <td className="py-2.5 px-4">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setQrEmployee(employee)}
                        className="p-1 text-emerald-600 hover:text-emerald-800 dark:text-emerald-400 dark:hover:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg transition-colors"
                        title="Show QR Code"
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                          strokeWidth={1.5}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5zM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5zM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0113.5 9.375v-4.5z"
                          />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M6.75 6.75h.75v.75h-.75v-.75zM6.75 16.5h.75v.75h-.75v-.75zM16.5 6.75h.75v.75h-.75v-.75zM13.5 13.5h.75v.75h-.75v-.75zM13.5 19.5h.75v.75h-.75v-.75zM19.5 13.5h.75v.75h-.75v-.75zM19.5 19.5h.75v.75h-.75v-.75zM16.5 16.5h.75v.75h-.75v-.75z"
                          />
                        </svg>
                      </button>
                      <button
                        onClick={() => setIdCardEmployee(employee)}
                        className="p-1 text-amber-600 hover:text-amber-800 dark:text-amber-400 dark:hover:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-lg transition-colors"
                        title="ID Card"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 9h3.75M15 12h3.75M15 15h3.75M4.5 19.5h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5zm6-10.125a1.875 1.875 0 11-3.75 0 1.875 1.875 0 013.75 0zm1.294 6.336a6.721 6.721 0 01-3.17.789 6.721 6.721 0 01-3.168-.789 3.376 3.376 0 016.338 0z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleEdit(employee)}
                        className="p-1 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                        title="Edit Employee"
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                          strokeWidth={1.5}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10"
                          />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDelete(employee.id)}
                        className="p-1.5 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                        title="Delete Employee"
                      >
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                          strokeWidth={1.5}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"
                          />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Employee Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999]">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Add Employee</h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded-lg text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  required
                  autoComplete="off"
                  data-lpignore="true"
                  data-form-type="other"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Email *
                </label>
                <input
                  type="text"
                  inputMode="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  required
                  autoComplete="off"
                  data-lpignore="true"
                  data-form-type="other"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Password *
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={formData.password}
                    onChange={(e) =>
                      setFormData({ ...formData, password: e.target.value })
                    }
                    required
                    autoComplete="new-password"
                    data-lpignore="true"
                    data-form-type="other"
                    className="w-full px-4 py-2 pr-12 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 focus:outline-none"
                  >
                    {showPassword ? (
                      <EyeSlashIcon className="w-5 h-5" />
                    ) : (
                      <EyeIcon className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Department
                  </label>
                  <input
                    type="text"
                    value={formData.department}
                    onChange={(e) =>
                      setFormData({ ...formData, department: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Position
                  </label>
                  <input
                    type="text"
                    value={formData.position}
                    onChange={(e) =>
                      setFormData({ ...formData, position: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Role
                </label>
                <select
                  value={formData.role}
                  onChange={(e) =>
                    setFormData({ ...formData, role: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                >
                  <option value="EMPLOYEE">Employee</option>
                  <option value="ADMIN">Admin</option>
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-2 px-4 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-2 px-4 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:bg-gray-400"
                >
                  {submitting ? "Creating..." : "Create Employee"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Employee Modal */}
      {showEditModal && editingEmployee && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999]">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Edit Employee</h2>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setEditingEmployee(null);
                }}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {editError && (
              <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded-lg text-sm">
                {editError}
              </div>
            )}

            <form onSubmit={handleEditSubmit} className="space-y-4" autoComplete="off">
              {/* Profile Photo Upload */}
              <div className="flex flex-col items-center gap-2">
                <div
                  className="relative w-20 h-20 rounded-full border-2 border-gray-300 dark:border-gray-600 overflow-hidden cursor-pointer group"
                  onClick={() => editFileInputRef.current?.click()}
                >
                  {editProfilePreview ? (
                    <img src={editProfilePreview} alt="Preview" className="w-full h-full object-cover" />
                  ) : editingEmployee?.profileImage ? (
                    <img src={editingEmployee.profileImage} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-primary-100 dark:bg-ppa-navy/30 flex items-center justify-center">
                      <span className="text-primary-700 dark:text-blue-300 font-bold text-2xl">
                        {editingEmployee?.name.charAt(0)}
                      </span>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
                    </svg>
                  </div>
                </div>
                <input
                  ref={editFileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={handleEditProfileChange}
                />
                <button
                  type="button"
                  onClick={() => editFileInputRef.current?.click()}
                  className="text-xs text-primary-600 dark:text-blue-400 hover:underline"
                >
                  {editingEmployee?.profileImage || editProfilePreview ? "Change Photo" : "Upload Photo"}
                </button>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  value={editFormData.name}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, name: e.target.value })
                  }
                  required
                  autoComplete="off"
                  data-lpignore="true"
                  data-form-type="other"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Email *
                </label>
                <input
                  type="text"
                  inputMode="email"
                  value={editFormData.email}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, email: e.target.value })
                  }
                  required
                  autoComplete="off"
                  data-lpignore="true"
                  data-form-type="other"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  New Password <span className="text-gray-400 font-normal">(leave blank to keep current)</span>
                </label>
                <div className="relative">
                  <input
                    type={showEditPassword ? "text" : "password"}
                    value={editFormData.password}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, password: e.target.value })
                    }
                    placeholder="••••••••"
                    autoComplete="new-password"
                    data-lpignore="true"
                    data-form-type="other"
                    className="w-full px-4 py-2 pr-12 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  />
                  <button
                    type="button"
                    onClick={() => setShowEditPassword(!showEditPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 focus:outline-none"
                  >
                    {showEditPassword ? (
                      <EyeSlashIcon className="w-5 h-5" />
                    ) : (
                      <EyeIcon className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Department
                  </label>
                  <input
                    type="text"
                    value={editFormData.department}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, department: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Position
                  </label>
                  <input
                    type="text"
                    value={editFormData.position}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, position: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Role
                </label>
                <select
                  value={editFormData.role}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, role: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                >
                  <option value="EMPLOYEE">Employee</option>
                  <option value="ADMIN">Admin</option>
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingEmployee(null);
                  }}
                  className="flex-1 py-2 px-4 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-2 px-4 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:bg-gray-400"
                >
                  {submitting ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QR Code Modal */}
      {qrEmployee && (
        <QRCodeModal
          employee={qrEmployee}
          onClose={() => setQrEmployee(null)}
          canvasRef={qrCanvasRef}
        />
      )}

      {/* ID Card Modal */}
      {idCardEmployee && (
        <IDCardModal
          employee={idCardEmployee}
          onClose={() => setIdCardEmployee(null)}
        />
      )}
    </div>
  );
}

function QRCodeModal({
  employee,
  onClose,
  canvasRef,
}: {
  employee: User;
  onClose: () => void;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
}) {
  const [ready, setReady] = useState(false);
  const localCanvasRef = useRef<HTMLCanvasElement>(null);
  const activeCanvas = canvasRef || localCanvasRef;

  useEffect(() => {
    const generateQR = async () => {
      const canvas = activeCanvas.current;
      if (!canvas) return;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const size = 280;
      const qrData = JSON.stringify({
        email: employee.email,
        name: employee.name,
        type: "PPA_ATTENDANCE",
      });

      await QRCode.toCanvas(canvas, qrData, {
        width: size,
        margin: 2,
        errorCorrectionLevel: "H",
        color: {
          dark: "#1e3a5f",
          light: "#ffffff",
        },
      });

      // Load and draw logo
      const logo = new Image();
      logo.crossOrigin = "anonymous";
      logo.onload = () => {
        const logoSize = size * 0.22;
        const logoX = (size - logoSize) / 2;
        const logoY = (size - logoSize) / 2;

        ctx.beginPath();
        ctx.arc(size / 2, size / 2, logoSize / 2 + 8, 0, 2 * Math.PI);
        ctx.fillStyle = "#ffffff";
        ctx.fill();

        ctx.beginPath();
        ctx.arc(size / 2, size / 2, logoSize / 2 + 8, 0, 2 * Math.PI);
        ctx.strokeStyle = "#1e3a5f";
        ctx.lineWidth = 3;
        ctx.stroke();

        ctx.drawImage(logo, logoX, logoY, logoSize, logoSize);
        setReady(true);
      };
      logo.onerror = () => {
        setReady(true);
      };
      logo.src = "/images/download-removebg-preview.png";
    };

    generateQR();
  }, [employee, activeCanvas]);

  const handleDownload = () => {
    const canvas = activeCanvas.current;
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = `${employee.name.replace(/\s+/g, "_")}_PPA_QR.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  };

  const handlePrint = () => {
    const canvas = activeCanvas.current;
    if (!canvas) return;
    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>PPA Attendance QR Code - ${employee.name}</title>
          <style>
            body {
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              margin: 0;
              padding: 20px;
              font-family: Arial, sans-serif;
              background: #fff;
            }
            .qr-card {
              border: 3px solid #1e3a5f;
              border-radius: 16px;
              padding: 30px;
              text-align: center;
              background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
              box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            }
            .header { color: #1e3a5f; font-size: 18px; font-weight: bold; margin-bottom: 5px; }
            .subheader { color: #64748b; font-size: 12px; margin-bottom: 20px; }
            .qr-image { border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.15); }
            .name { margin-top: 20px; font-size: 20px; font-weight: bold; color: #1e3a5f; }
            .email { color: #64748b; font-size: 12px; margin-top: 5px; }
            .footer { margin-top: 15px; font-size: 10px; color: #94a3b8; }
            @media print { body { padding: 0; } .qr-card { box-shadow: none; border: 2px solid #1e3a5f; } }
          </style>
        </head>
        <body>
          <div class="qr-card">
            <div class="header">PHILIPPINE PORTS AUTHORITY</div>
            <div class="subheader">Attendance Monitoring System</div>
            <img src="${canvas.toDataURL("image/png")}" class="qr-image" />
            <div class="name">${employee.name}</div>
            <div class="email">${employee.email}</div>
            <div class="footer">Scan this QR code at the attendance station</div>
          </div>
          <script>window.onload = function() { window.print(); }<\/script>
        </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999]" onClick={onClose}>
      <div
        className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-6 w-full max-w-sm mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Employee QR Code</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex flex-col items-center gap-3">
          <div className="p-3 bg-white rounded-xl shadow border-2 border-blue-100">
            <canvas ref={activeCanvas as React.RefObject<HTMLCanvasElement>} className="rounded-lg" />
          </div>
          <div className="text-center">
            <p className="font-semibold text-gray-900 dark:text-white">{employee.name}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">{employee.email}</p>
            {employee.department && (
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{employee.department}</p>
            )}
          </div>
          <div className="flex gap-2 w-full">
            <button
              onClick={handleDownload}
              className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-1.5 text-sm font-medium shadow-md"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
              </svg>
              Download
            </button>
            <button
              onClick={handlePrint}
              className="flex-1 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-1.5 text-sm font-medium shadow-md"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0110.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0l.229 2.523a1.125 1.125 0 01-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0021 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 00-1.913-.247M6.34 18H5.25A2.25 2.25 0 013 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 011.913-.247m10.5 0a48.536 48.536 0 00-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659M18 10.5h.008v.008H18V10.5zm-3 0h.008v.008H15V10.5z" />
              </svg>
              Print
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function IDCardModal({
  employee,
  onClose,
}: {
  employee: User;
  onClose: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>("");

  useEffect(() => {
    const generateQR = async () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const size = 200;
      canvas.width = size;
      canvas.height = size;

      const qrData = JSON.stringify({
        email: employee.email,
        name: employee.name,
        type: "PPA_ATTENDANCE",
      });

      await QRCode.toCanvas(canvas, qrData, {
        width: size,
        margin: 2,
        errorCorrectionLevel: "H",
        color: { dark: "#0038A8", light: "#ffffff" },
      });

      const logo = new Image();
      logo.crossOrigin = "anonymous";
      logo.onload = () => {
        const logoSize = size * 0.22;
        const logoX = (size - logoSize) / 2;
        const logoY = (size - logoSize) / 2;
        ctx.beginPath();
        ctx.arc(size / 2, size / 2, logoSize / 2 + 6, 0, 2 * Math.PI);
        ctx.fillStyle = "#ffffff";
        ctx.fill();
        ctx.beginPath();
        ctx.arc(size / 2, size / 2, logoSize / 2 + 6, 0, 2 * Math.PI);
        ctx.strokeStyle = "#0038A8";
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.drawImage(logo, logoX, logoY, logoSize, logoSize);
        setQrDataUrl(canvas.toDataURL("image/png"));
      };
      logo.onerror = () => setQrDataUrl(canvas.toDataURL("image/png"));
      logo.src = "/images/ppa-logo-nobg.png";
    };
    generateQR();
  }, [employee]);

  const handlePrint = () => {
    if (!qrDataUrl) return;
    const profileImg = employee.profileImage;
    const profileHTML = profileImg
      ? '<img src="' + profileImg + '" alt="Profile" class="profile-image" />'
      : '<div class="profile-placeholder">' + employee.name.charAt(0).toUpperCase() + "</div>";

    const css = [
      ".card { width: 2.125in; height: 3.375in; border-radius: 12px; overflow: hidden; position: relative; background: linear-gradient(180deg, #fff 0%, #f8fafc 100%); border: 1px solid #e2e8f0; }",
      ".corner-tl { position: absolute; top: 0; left: 0; width: 0; height: 0; border-left: 50px solid #0038A8; border-bottom: 50px solid transparent; }",
      ".corner-br { position: absolute; bottom: 0; right: 0; width: 0; height: 0; border-right: 50px solid #CE1126; border-top: 50px solid transparent; }",
      ".corner-tr { position: absolute; top: 0; right: 0; width: 0; height: 0; border-right: 50px solid #CE1126; border-bottom: 50px solid transparent; }",
      ".corner-bl { position: absolute; bottom: 0; left: 0; width: 0; height: 0; border-left: 50px solid #0038A8; border-top: 50px solid transparent; }",
      ".card-header { padding: 16px 12px 8px; display: flex; align-items: center; justify-content: center; gap: 8px; position: relative; z-index: 1; }",
      ".logo { width: 36px; height: 36px; object-fit: contain; }",
      ".company-name { font-size: 9px; font-weight: 700; color: #0038A8; text-transform: uppercase; letter-spacing: 0.3px; line-height: 1.3; text-align: left; }",
      ".profile-section { display: flex; flex-direction: column; align-items: center; padding: 8px 12px; position: relative; z-index: 1; }",
      ".profile-image-container { width: 80px; height: 80px; border-radius: 50%; border: 3px solid #0038A8; overflow: hidden; background: linear-gradient(135deg, #f1f5f9, #e2e8f0); box-shadow: 0 4px 12px rgba(0,0,0,0.15); }",
      ".profile-image { width: 100%; height: 100%; object-fit: cover; }",
      ".profile-placeholder { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; font-size: 32px; font-weight: bold; color: #64748b; background: linear-gradient(135deg, #e2e8f0, #cbd5e1); }",
      ".user-info { text-align: center; margin-top: 10px; padding: 0 8px; }",
      ".user-name { font-size: 13px; font-weight: 700; color: #1e293b; margin-bottom: 4px; line-height: 1.2; }",
      ".user-department { font-size: 9px; color: #64748b; margin-bottom: 2px; }",
      ".user-position { font-size: 9px; color: #CE1126; font-weight: 600; }",
      ".id-badge { margin-top: 12px; display: inline-block; background: linear-gradient(135deg, #0038A8, #1e4d8c); color: #fff; padding: 5px 16px; border-radius: 12px; font-size: 8px; font-weight: 600; letter-spacing: 0.5px; text-transform: uppercase; }",
      ".accent-line { width: 40px; height: 3px; background: #FCD116; margin: 12px auto 0; border-radius: 2px; }",
      ".card-back { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 16px; }",
      ".back-company { font-size: 10px; font-weight: 700; color: #0038A8; }",
      ".back-title { font-size: 8px; color: #0038A8; margin-bottom: 12px; text-transform: uppercase; letter-spacing: 1px; font-weight: 500; position: relative; z-index: 1; }",
      ".qr-container { background: #fff; padding: 10px; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); border: 2px solid #0038A8; position: relative; z-index: 1; }",
      ".qr-code { width: 110px; height: 110px; display: block; }",
    ].join("\n  ");

    const html = '<!DOCTYPE html><html><head><meta charset="utf-8"><title>PPA ID Card - ' + employee.name + "</title>" +
      "<style>@page { margin: 0; }" +
      "* { margin: 0; padding: 0; box-sizing: border-box; }" +
      "body { font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Arial, sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; padding: 20px; background: #f1f5f9; }" +
      ".cards-container { display: flex; gap: 40px; flex-wrap: wrap; justify-content: center; }" +
      ".card-wrapper { display: flex; flex-direction: column; align-items: center; }" +
      ".card-label { text-align: center; font-size: 12px; color: #64748b; margin-bottom: 8px; font-weight: 500; }" +
      css + "\n" +
      ".cut-border { border: 2px solid #000; border-radius: 14px; padding: 2px; }" +
      "@media print { @page { margin: 10mm; } body { background: #fff; padding: 0; } .cards-container { gap: 30px; } .card { box-shadow: none; } .card-label { display: none; } .no-print { display: none !important; } .cut-border { border: 2px solid #000; } }" +
      ".no-print { position: fixed; top: 12px; right: 16px; z-index: 100; }" +
      ".no-print button { padding: 8px 24px; font-size: 12pt; cursor: pointer; background: #0d3a5c; color: #fff; border: none; border-radius: 6px; }" +
      "</style></head><body>" +
      '<div class="no-print"><button onclick="window.print()">Print ID Card</button></div>' +
      '<div class="cards-container">' +
      '<div class="card-wrapper"><div class="card-label">Front</div><div class="cut-border"><div class="card">' +
        '<div class="corner-tl"></div><div class="corner-br"></div>' +
        '<div class="card-header"><img src="/images/ppa-logo-nobg.png" alt="PPA Logo" class="logo" /><div class="company-name">Philippine<br/>Ports Authority</div></div>' +
        '<div class="profile-section"><div class="profile-image-container">' + profileHTML + '</div>' +
        '<div class="user-info"><div class="user-name">' + employee.name + "</div>" +
        (employee.department ? '<div class="user-department">' + employee.department + "</div>" : "") +
        (employee.position ? '<div class="user-position">' + employee.position + "</div>" : "") +
        '</div><span class="id-badge">Employee ID</span><div class="accent-line"></div></div>' +
      "</div></div></div>" +
      '<div class="card-wrapper"><div class="card-label">Back</div><div class="cut-border"><div class="card card-back">' +
        '<div class="corner-tr"></div><div class="corner-bl"></div>' +
        '<div style="text-align:center;margin-bottom:4px;position:relative;z-index:1"><span class="back-company">Philippine Ports Authority</span></div>' +
        '<div class="back-title">Scan for Attendance</div>' +
        '<div class="qr-container"><img src="' + qrDataUrl + '" class="qr-code" alt="QR Code" /></div>' +
      "</div></div></div>" +
      "</div>" +
      '<script>window.onload = function() { setTimeout(function() { window.print(); }, 500); }<\/script>' +
      "</body></html>";

    const w = window.open("", "_blank");
    if (w) {
      w.document.write(html);
      w.document.close();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999]" onClick={onClose}>
      <div
        className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-6 w-full max-w-lg mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Employee ID Card</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Hidden canvas for QR generation */}
        <canvas ref={canvasRef} className="hidden" />

        {/* Card Preview */}
        <div className="bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 rounded-xl p-4">
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            {/* Front Card */}
            <div className="flex flex-col items-center">
              <span className="text-xs text-gray-500 dark:text-gray-400 mb-2">Front</span>
              <div className="bg-gradient-to-b from-white to-slate-50 rounded-xl overflow-hidden shadow-xl relative border border-slate-200" style={{ width: "170px", height: "270px" }}>
                <div className="absolute top-0 left-0 w-0 h-0 border-l-[40px] border-l-[#0038A8] border-b-[40px] border-b-transparent"></div>
                <div className="absolute bottom-0 right-0 w-0 h-0 border-r-[40px] border-r-[#CE1126] border-t-[40px] border-t-transparent"></div>
                <div className="flex items-center justify-center gap-2 pt-4 px-3 relative z-10">
                  <img src="/images/ppa-logo-nobg.png" alt="PPA" className="w-9 h-9 object-contain" />
                  <p className="text-[8px] font-bold text-[#0038A8] leading-tight uppercase">Philippine<br/>Ports Authority</p>
                </div>
                <div className="flex flex-col items-center pt-2 relative z-10">
                  <div className="w-[72px] h-[72px] rounded-full border-[3px] border-[#0038A8] overflow-hidden bg-gradient-to-br from-slate-100 to-slate-200 shadow-lg">
                    {employee.profileImage ? (
                      <img src={employee.profileImage} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-500 font-bold text-2xl bg-gradient-to-br from-slate-200 to-slate-300">
                        {employee.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="text-center mt-2 px-3">
                    <p className="text-[11px] font-bold text-slate-800 leading-tight">{employee.name}</p>
                    {employee.department && <p className="text-[7px] text-slate-500 mt-1">{employee.department}</p>}
                    {employee.position && <p className="text-[8px] text-[#CE1126] font-semibold">{employee.position}</p>}
                  </div>
                  <span className="mt-3 text-[7px] bg-gradient-to-r from-[#0038A8] to-[#1e4d8c] text-white px-4 py-1.5 rounded-xl font-semibold uppercase tracking-wide">Employee ID</span>
                  <div className="w-10 h-1 bg-[#FCD116] rounded-full mt-3"></div>
                </div>
              </div>
            </div>

            {/* Back Card */}
            <div className="flex flex-col items-center">
              <span className="text-xs text-gray-500 dark:text-gray-400 mb-2">Back</span>
              <div className="bg-gradient-to-b from-white to-slate-50 rounded-xl overflow-hidden shadow-xl relative border border-slate-200 flex flex-col items-center justify-center" style={{ width: "170px", height: "270px", minHeight: "270px" }}>
                <div className="absolute top-0 right-0 w-0 h-0 border-r-[40px] border-r-[#CE1126] border-b-[40px] border-b-transparent"></div>
                <div className="absolute bottom-0 left-0 w-0 h-0 border-l-[40px] border-l-[#0038A8] border-t-[40px] border-t-transparent"></div>
                <p className="text-[9px] text-[#0038A8] font-bold mb-1 relative z-10">Philippine Ports Authority</p>
                <p className="text-[7px] text-[#0038A8] uppercase tracking-wider font-medium mb-3 relative z-10">Scan for Attendance</p>
                <div className="bg-white p-2 rounded-xl shadow-md border-2 border-[#0038A8] relative z-10">
                  {qrDataUrl ? (
                    <img src={qrDataUrl} alt="QR Code" className="w-[100px] h-[100px]" />
                  ) : (
                    <div className="w-[100px] h-[100px] bg-slate-100 animate-pulse rounded-lg"></div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Print Button */}
        <div className="mt-4">
          <button
            onClick={handlePrint}
            disabled={!qrDataUrl}
            className="w-full px-4 py-2.5 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors flex items-center justify-center gap-2 text-sm font-medium shadow-md disabled:opacity-50"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0110.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0l.229 2.523a1.125 1.125 0 01-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0021 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 00-1.913-.247M6.34 18H5.25A2.25 2.25 0 013 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 011.913-.247m10.5 0a48.536 48.536 0 00-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659M18 10.5h.008v.008H18V10.5zm-3 0h.008v.008H15V10.5z" />
            </svg>
            Print ID Card (Front & Back)
          </button>
        </div>
      </div>
    </div>
  );
}
