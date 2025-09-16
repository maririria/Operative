"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase-browser";
import RoleBasedNavbar from "@/components/RoleBasedNavbar";
import { useRouter } from "next/navigation";

export default function MachineInfo() {
  const [machines, setMachines] = useState([]);
  const [formData, setFormData] = useState({
    name: "",
    size: "",
    capacity: "",
    description: "",
    availableDays: "",
  });
  const [editingMachine, setEditingMachine] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const router = useRouter();

  useEffect(() => {
    checkAuth();
    loadMachines();
  }, []);

  // ✅ Check authentication & role
  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push("/login");
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile) {
      router.push("/login");
      return;
    }

    setUserRole(profile.role);

    if (profile.role !== "admin") {
      router.push("/" + profile.role);
    }
  };

  // ✅ Load machines
  const loadMachines = async () => {
    try {
      const { data, error } = await supabase
        .from("machines")
        .select("*")
        .order("name");

      if (error) throw error;
      setMachines(data || []);
    } catch (error) {
      console.error("Error loading machines:", error);
    }
  };

  // ✅ Handle form input
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // ✅ Add / Update machine
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingMachine) {
        // 🔹 Update existing machine
        const { error } = await supabase
          .from("machines")
          .update({
            name: formData.name,
            size: formData.size,
            capacity: formData.capacity ? parseInt(formData.capacity) : null,
            description: formData.description,
            available_days: formData.availableDays
              ? parseInt(formData.availableDays)
              : null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", editingMachine.id);

        if (error) throw error;
      } else {
        // 🔹 Insert new machine
        const { error } = await supabase.from("machines").insert({
          name: formData.name,
          size: formData.size,
          capacity: formData.capacity ? parseInt(formData.capacity) : null,
          description: formData.description,
          available_days: formData.availableDays
            ? parseInt(formData.availableDays)
            : null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

        if (error) throw error;
      }

      // ✅ Reset form
      setFormData({
        name: "",
        size: "",
        capacity: "",
        description: "",
        availableDays: "",
      });
      setEditingMachine(null);
      loadMachines();

      alert(
        editingMachine
          ? "✅ Machine updated successfully"
          : "✅ Machine added successfully"
      );
    } catch (error) {
      console.error("Error saving machine:", error);
      alert("❌ Error: " + error.message);
    }
  };

  // ✅ Edit machine
  const handleEdit = (machine) => {
    setFormData({
      name: machine.name,
      size: machine.size || "",
      capacity: machine.capacity || "",
      description: machine.description || "",
      availableDays: machine.available_days || "",
    });
    setEditingMachine(machine);
  };

  // ✅ Delete machine
  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to delete this machine?")) return;

    try {
      const { error } = await supabase.from("machines").delete().eq("id", id);

      if (error) throw error;

      loadMachines();
      alert("✅ Machine deleted successfully");
    } catch (error) {
      console.error("Error deleting machine:", error);
      alert("❌ Error: " + error.message);
    }
  };

  const cancelEdit = () => {
    setFormData({
      name: "",
      size: "",
      capacity: "",
      description: "",
      availableDays: "",
    });
    setEditingMachine(null);
  };

  if (!userRole) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <RoleBasedNavbar />

      <div className="flex-1 p-6">
        <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-md overflow-hidden">
          {/* Heading */}
          <div className="p-6 border-b border-gray-200">
            <h1 className="text-2xl font-bold text-gray-800 text-center">
              Machine Information
            </h1>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div>
              <label className="block text-sm text-gray-800 font-medium mb-1">
                Name:
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 text-gray-800"
                placeholder="e.g., HB-08"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-800 font-medium mb-1">
                  Size:
                </label>
                <input
                  type="text"
                  name="size"
                  value={formData.size}
                  onChange={handleChange}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 text-gray-800"
                  placeholder="e.g., 20"
                />
              </div>

              <div>
                <label className="block text-sm  text-gray-800 font-medium mb-1">
                  Capacity:
                </label>
                <input
                  type="number"
                  name="capacity"
                  value={formData.capacity}
                  onChange={handleChange}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 text-gray-800"
                  placeholder="e.g., 1000"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm text-gray-800 font-medium mb-1">
                Description:
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 text-gray-800 resize-none"
                placeholder="Short description"
                rows="2"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-800 font-medium mb-1">
                Available Days:
              </label>
              <input
                type="number"
                name="availableDays"
                value={formData.availableDays}
                onChange={handleChange}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 text-gray-800"
                placeholder="e.g., 5"
              />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              {editingMachine && (
                <button
                  type="button"
                  onClick={cancelEdit}
                  className="bg-gray-500 text-white py-2 px-4 rounded-lg hover:bg-gray-600 transition duration-200 text-sm font-medium"
                >
                  CANCEL
                </button>
              )}
              <button
                type="submit"
                className="bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600 transition duration-200 text-sm font-medium"
              >
                {editingMachine ? "UPDATE" : "SUBMIT"}
              </button>
            </div>
          </form>

          {/* Machines List */}
          <div className="p-6 border-t border-gray-200">
            <h2 className="text-lg font-semibold mb-4 text-gray-800">
              Machines List
            </h2>

            {machines.length === 0 ? (
              <p className="text-gray-500  text-gray-800  text-center py-4">
                No machines added yet.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full border-collapse">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="py-2 px-4 text-left  text-gray-700  border-b border-gray-300">
                        Name
                      </th>
                      <th className="py-2 px-4 text-left   text-gray-700  border-b border-gray-300">
                        Size
                      </th>
                      <th className="py-2 px-4 text-left  text-gray-700  border-b border-gray-300">
                        Capacity
                      </th>
                      <th className="py-2 px-4 text-left  text-gray-700  border-b border-gray-300">
                        Available Days
                      </th>
                      <th className="py-2 px-4 text-left  text-gray-700   border-b border-gray-300">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {machines.map((machine) => (
                      <tr
                        key={machine.id}
                        className="border-b  text-gray-600 border-gray-200 hover:bg-gray-50"
                      >
                        <td className="py-2  px-4">{machine.name}</td>
                        <td className="py-2 px-4">{machine.size}</td>
                        <td className="py-2 px-4">{machine.capacity}</td>
                        <td className="py-2 px-4">{machine.available_days}</td>
                        <td className="py-2 px-4">
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleEdit(machine)}
                              className="bg-blue-500 text-white px-2 py-1 rounded text-xs hover:bg-blue-600"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDelete(machine.id)}
                              className="bg-red-500 text-white px-2 py-1 rounded text-xs hover:bg-red-600"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}