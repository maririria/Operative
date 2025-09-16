"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase-browser";
import { useRouter } from "next/navigation";
import PageLayout from '@/components/PageLayout';
import AdminLayout from '@/components/AdminLayout';

export default function AdminDashboard() {
  const [workers, setWorkers] = useState([]);
  const [newWorker, setNewWorker] = useState({
    full_name: "",
    employee_code: "",
    roles: ["printing"], // multiple roles allowed
    password: "",
  });
  const [editingWorker, setEditingWorker] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [userRoles, setUserRoles] = useState([]); // for dynamic navbar
  const router = useRouter();

  // Available roles
  const availableRoles = [
    "printing", "pasting", "lamination", 
    "prepress", "plates", "card_cutting", "sorting"
  ];

  useEffect(() => {
    checkAdmin();
  }, []);

  // Check admin status
  const checkAdmin = async () => {
    try {
      setIsCheckingAuth(true);
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session) {
        router.push("/login");
        return;
      }

      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        router.push("/login");
        return;
      }

      // get both role and roles
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role, roles")
        .eq("id", user.id)
        .single();

      if (profileError) {
        if (profileError.code === "PGRST116") {
          await supabase.auth.signOut();
          router.push("/login");
          return;
        }
        throw profileError;
      }

      // Save roles for navbar
      setUserRoles(Array.isArray(profile.roles) ? profile.roles : []);

      
      if (!profile || profile.role !== "admin") {
        setIsAdmin(false);
        router.push("/login");
      } else {
        setIsAdmin(true);
        loadWorkers();
      }
    } catch (error) {
      console.error("Admin check error:", error);
      router.push("/login");
    } finally {
      setIsCheckingAuth(false);
    }
  };

  // Load workers
// --- replace whole function ---
async function loadWorkers() {
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, full_name, employee_code, role, roles, created_at")
      .neq("role", "admin")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error loading workers:", error.message, error);
      return;
    }

    const formattedWorkers = (data || []).map(worker => ({
      ...worker,
      roles: Array.isArray(worker.roles)
        ? worker.roles
        : worker.role
        ? [worker.role]
        : ["printing"],
    }));

    setWorkers(formattedWorkers);
  } catch (error) {
    console.error("Error loading workers:", error?.message || error);
  }
}


  // Delete worker
  const handleDelete = async (id) => {
    try {
      await fetch("/api/workers", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      setWorkers(prev => prev.filter((w) => w.id !== id));
      setSuccess("Worker deleted successfully!");
    } catch (error) {
      setError("Failed to delete worker");
    }
  };

  // Edit worker
  const handleEdit = (worker) => {
    setEditingWorker({
      ...worker,
      password: "",
      roles: Array.isArray(worker.roles) ? worker.roles :
             worker.role ? [worker.role] : ["printing"]
    });
  };

  const handleCancelEdit = () => {
    setEditingWorker(null);
  };

  // Toggle role selection
  const toggleRole = (role, isEditing = false) => {
    if (isEditing) {
      setEditingWorker(prev => {
        const currentRoles = prev.roles || [];
        const newRoles = currentRoles.includes(role)
          ? currentRoles.filter(r => r !== role)
          : [...currentRoles, role];
        return { ...prev, roles: newRoles };
      });
    } else {
      setNewWorker(prev => {
        const currentRoles = prev.roles || [];
        const newRoles = currentRoles.includes(role)
          ? currentRoles.filter(r => r !== role)
          : [...currentRoles, role];
        return { ...prev, roles: newRoles };
      });
    }
  };

  // Update worker
  const handleUpdateWorker = async (e) => {
    e.preventDefault();
    if (!editingWorker) return;

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      if (!editingWorker.full_name || !editingWorker.employee_code) {
        throw new Error("Name and Employee Code are required");
      }
      if (!editingWorker.roles || editingWorker.roles.length === 0) {
        throw new Error("At least one role must be selected");
      }

      const res = await fetch("/api/workers", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingWorker.id,
          full_name: editingWorker.full_name,
          employee_code: editingWorker.employee_code,
          roles: editingWorker.roles,
          password: editingWorker.password || undefined,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || res.statusText);
      }

      setWorkers(prev =>
        prev.map(w => (w.id === editingWorker.id ? { ...editingWorker } : w))
      );
      setEditingWorker(null);
      setSuccess("Worker updated successfully!");
    } catch (err) {
      setError(err.message || "Failed to update worker");
    } finally {
      setLoading(false);
    }
  };

  // Add worker
  const handleAddWorker = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      if (!newWorker.full_name || !newWorker.employee_code || !newWorker.password) {
        throw new Error("All fields are required");
      }
      if (newWorker.password.length < 6) {
        throw new Error("Password must be at least 6 characters");
      }
      if (!newWorker.roles || newWorker.roles.length === 0) {
        throw new Error("At least one role must be selected");
      }

      const { data: existingWorker } = await supabase
        .from("profiles")
        .select("employee_code")
        .eq("employee_code", newWorker.employee_code)
        .single();
      if (existingWorker) {
        throw new Error("Employee code already exists");
      }

      const res = await fetch("/api/workers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newWorker),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to add worker");

      setNewWorker({ full_name: "", employee_code: "", roles: ["printing"], password: "" });
      await loadWorkers();
      setSuccess("Worker added successfully!");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Auto clear messages
  useEffect(() => {
    if (success) {
      const t = setTimeout(() => setSuccess(""), 3000);
      return () => clearTimeout(t);
    }
  }, [success]);

  useEffect(() => {
    if (error) {
      const t = setTimeout(() => setError(""), 3000);
      return () => clearTimeout(t);
    }
  }, [error]);

  // Show loading
  if (isCheckingAuth) {
    return (
      <PageLayout title="Admin Dashboard">
        <div className="flex justify-center items-center h-64">
          <p className="text-gray-600">Checking authentication...</p>
        </div>
      </PageLayout>
    );
  }

  if (!isAdmin) {
    return (
      <PageLayout title="Admin Dashboard">
        <div className="flex justify-center items-center h-64">
          <p className="text-gray-600">Redirecting to login...</p>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout title="Admin Dashboard" userRoles={userRoles}>
      {/* Error and Success Messages */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <strong>Error:</strong> {error}
        </div>
      )}
      
      {success && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
          <strong>Success:</strong> {success}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Add/Edit Worker Form */}
        <div className="bg-white p-6 rounded-xl shadow-lg border border-blue-200">
          <h2 className="text-xl font-bold text-blue-900 mb-4 pb-2 border-b border-blue-100">
            {editingWorker ? "EDIT WORKER" : "ADD NEW WORKER"}
          </h2>
          
          {editingWorker ? (
            // Edit Form
            <form onSubmit={handleUpdateWorker} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-blue-900 mb-2">Full Name *</label>
                <input
                  type="text"
                  required
                  value={editingWorker.full_name}
                  onChange={(e) => setEditingWorker({ ...editingWorker, full_name: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter full name"
                  disabled={loading}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-blue-900 mb-2">Employee Code *</label>
                <input
                  type="text"
                  required
                  value={editingWorker.employee_code}
                  onChange={(e) => setEditingWorker({ ...editingWorker, employee_code: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter employee code"
                  disabled={loading}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-blue-900 mb-2">Roles *</label>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {availableRoles.map((role) => (
                    <div key={role} className="flex items-center">
                      <input
                        type="checkbox"
                        id={`edit-${role}`}
                        checked={editingWorker.roles.includes(role)}
                        onChange={() => toggleRole(role, true)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        disabled={loading}
                      />
                      <label htmlFor={`edit-${role}`} className="ml-2 block text-sm text-gray-900 capitalize">
                        {role.replace('_', ' ')}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-blue-900 mb-2">Password (leave blank to keep current)</label>
                <input
                  type="password"
                  value={editingWorker.password || ""}
                  onChange={(e) => setEditingWorker({ ...editingWorker, password: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Set new password"
                  disabled={loading}
                />
              </div>
              
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-blue-600 text-white font-medium py-2 rounded-md hover:bg-blue-700 disabled:bg-blue-400 transition duration-200 shadow-sm"
                >
                  {loading ? "UPDATING..." : "UPDATE WORKER"}
                </button>
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  disabled={loading}
                  className="flex-1 bg-gray-500 text-white font-medium py-2 rounded-md hover:bg-gray-600 disabled:bg-gray-400 transition duration-200 shadow-sm"
                >
                  CANCEL
                </button>
              </div>
            </form>
          ) : (
            // Add Form
            <form onSubmit={handleAddWorker} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-blue-900 mb-2">Full Name *</label>
                <input
                  type="text"
                  required
                  value={newWorker.full_name}
                  onChange={(e) => setNewWorker({ ...newWorker, full_name: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter full name"
                  disabled={loading}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-blue-900 mb-2">Employee Code *</label>
                <input
                  type="text"
                  required
                  value={newWorker.employee_code}
                  onChange={(e) => setNewWorker({ ...newWorker, employee_code: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter employee code"
                  disabled={loading}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-blue-900 mb-2">Roles *</label>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {availableRoles.map((role) => (
                    <div key={role} className="flex items-center">
                      <input
                        type="checkbox"
                        id={`new-${role}`}
                        checked={newWorker.roles.includes(role)}
                        onChange={() => toggleRole(role, false)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        disabled={loading}
                      />
                      <label htmlFor={`new-${role}`} className="ml-2 block text-sm text-gray-900 capitalize">
                        {role.replace('_', ' ')}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-blue-900 mb-2">Password * (min. 6 characters)</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={newWorker.password}
                  onChange={(e) => setNewWorker({ ...newWorker, password: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Set password"
                  disabled={loading}
                />
              </div>
              
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 text-white font-medium py-2 rounded-md hover:bg-blue-700 disabled:bg-blue-400 transition duration-200 shadow-sm"
              >
                {loading ? "ADDING WORKER..." : "ADD WORKER"}
              </button>
            </form>
          )}
        </div>

        {/* Workers List */}
        <div className="bg-white p-6 rounded-xl shadow-lg border border-blue-200">
          <h2 className="text-xl font-bold text-blue-900 mb-4 pb-2 border-b border-blue-100">
            WORKERS LIST ({workers.length})
          </h2>
          
          {workers.length > 0 ? (
            <div className="overflow-x-auto rounded-md border border-gray-200">
              <table className="min-w-full border-collapse bg-white">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="px-4 py-2 text-left font-medium text-gray-700">NAME</th>
                    <th className="px-4 py-2 text-left font-medium text-gray-700">EMP CODE</th>
                    <th className="px-4 py-2 text-left font-medium text-gray-700">ROLES</th>
                    <th className="px-4 py-2 text-left font-medium text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {workers.map((worker) => (
                    <tr key={worker.id} className="hover:bg-gray-50">
                 <td className="px-4 py-2 font-medium text-gray-900">
                   {worker.full_name || worker.employee_code}
                 </td>                      
                 <td className="px-4 py-2 text-gray-700">{worker.employee_code}</td>
                      <td className="px-4 py-2 text-gray-700">
                        <div className="flex flex-wrap gap-1">
                          {worker.roles && worker.roles.map((role, index) => (
                            <span 
                              key={index} 
                              className="bg-blue-100 text-blue-800 text-xs font-medium px-2 py-0.5 rounded capitalize"
                            >
                              {role.replace('_', ' ')}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="py-2 px-3 flex gap-2">
                        <button
                          onClick={() => handleEdit(worker)}
                          className="bg-yellow-500 text-white px-2 py-1 rounded text-xs hover:bg-yellow-600"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(worker.id)}
                          className="bg-red-500 text-white px-2 py-1 rounded text-xs hover:bg-red-600"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <p>No workers found</p>
              <p className="text-sm mt-1">Add workers using the form</p>
            </div>
          )}
        </div>
      </div>
    </PageLayout>
  );
}