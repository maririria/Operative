"use client";
import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase-browser";
import { useRouter } from "next/navigation";
import RoleBasedNavbar from '@/components/RoleBasedNavbar';

// Helper: map each page -> roles
function getAllowedRoles(page) {
  switch (page) {
    case "Job Card":
      return ["admin"];
    case "Pre-Press":
      return ["admin", "prepress"];
    case "Plates":
      return ["admin", "plates"];
    case "Card Cutting":
      return ["admin", "card_cutting"];
    case "Printing":
      return ["admin", "printing"];
    case "Pasting":
      return ["admin", "pasting"];
    case "Sorting":
      return ["admin", "sorting"];
    case "Reports":
      return ["admin"];
    default:
      return ["admin"];
  }
}

// Helper: get allowed pages based on role
function getAllowedPages(role) {
  if (role === "admin") {
    return [
      "Job Card",
      "Pre-Press",
      "Plates",
      "Card Cutting",
      "Printing",
      "Pasting",
      "Sorting",
      "Reports",
    ];
  }
  
  // For workers, only show their specific page
  const roleToPage = {
    prepress: "Pre-Press",
    plates: "Plates",
    card_cutting: "Card Cutting",
    printing: "Printing",
    pasting: "Pasting",
    sorting: "Sorting"
  };
  
  return [roleToPage[role] || role.charAt(0).toUpperCase() + role.slice(1).replace('_', ' ')];
}

export default function JobCardForm() {
  const [formData, setFormData] = useState({
    jobId: "",
    customer: "",
    startDate: "",
    requiredDate: "",    
    subJobId: "1",
    color: "",
    cardSize: "",
    cardQty: "",
    itemQty: "",
    description: "",
    Printing: false,
  });


  
  const [subJobs, setSubJobs] = useState([]);
  const [selectedMachines, setSelectedMachines] = useState([]);
  const [showPrintingModal, setShowPrintingModal] = useState(false);
  const [showMachineForm, setShowMachineForm] = useState(false);
  const [activePage, setActivePage] = useState("Job Card");
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [editingSubJob, setEditingSubJob] = useState(null);
  const [machines, setMachines] = useState([]);
  const [userRole, setUserRole] = useState(null);
  const router = useRouter();
  const subJobsTableRef = useRef(null);
  // Add this useEffect to load machines
useEffect(() => {
  loadMachines();
}, []);

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


  const pages = [
    "Job Card",
    "Pre-Press",
    "Plates",
    "Card Cutting",
    "Printing",
    "Pasting",
    "Sorting",
    "Reports",
  ];
  const additionalMenuItems = [
    "Varnish",
    "Lamination",
    "Joint",
    "Die Cutting",
    "Foil",
    "Pasting",
    "Screen Printing",
    "Embose",
    "Double Tape",
  ];

  // Use useEffect to load the initial machines only once

  const [selectedTasks, setSelectedTasks] = useState({});
  const [userUID, setUserUID] = useState(null);

  // Add authentication check
  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push("/login");
      return;
    }

    setUserUID(user.id);

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
    
    // Only admin can access job card form
    if (profile.role !== "admin") {
      router.push("/" + profile.role);
    }
  };

  const handleTaskChange = (taskName) => {
    setSelectedTasks(prev => ({
      ...prev,
      [taskName]: !prev[taskName]
    }));
  };

const [processesList, setProcessesList] = useState([]);

// Load processes from database
useEffect(() => {
  loadProcesses();
}, []);

const loadProcesses = async () => {
  try {
    const { data, error } = await supabase
      .from("processes")
      .select("process_name")
      .order("process_name");
    
    if (error) throw error;
    setProcessesList(data.map(item => item.process_name));
  } catch (error) {
    console.error("Error loading processes:", error);
  }
};

  // Machine Form State (for new machine info)
  const [machineFormData, setMachineFormData] = useState({
    name: "",
    size: "",
    capacity: "",
    description: "",
    availableDays: "",
  });

  const toggleMachine = (machineId) => {
    setSelectedMachines((prev) =>
      prev.includes(machineId)
        ? prev.filter((id) => id !== machineId)
        : [...prev, machineId]
    );
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));

    if (name === "Printing" && type === "checkbox") {
      setShowPrintingModal(checked);
    }
  };

  const handleMachineFormChange = (e) => {
    const { name, value } = e.target;
    setMachineFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleMachineFormSubmit = (e) => {
    e.preventDefault();
    const newMachine = {
      id: machineFormData.name,
      description: machineFormData.description,
      size: machineFormData.size,
      capacity: machineFormData.capacity,
      days: machineFormData.availableDays,
    };
    setMachines((prev) => [...prev, newMachine]);
    setShowMachineForm(false);
    setMachineFormData({
      name: "",
      size: "",
      capacity: "",
      description: "",
      availableDays: "",
    });
    console.log("New Machine Added:", newMachine);
  };

  const handleAddSubJob = (e) => {
    e.preventDefault();
    const subJobDetails = {
      subJobId: formData.subJobId,
      color: formData.color,
      cardSize: formData.cardSize,
      cardQty: formData.cardQty ? parseInt(formData.cardQty, 10) : 0,
      itemQty: formData.itemQty ? parseInt(formData.itemQty, 10) : 0,
      description: formData.description,
      selectedTasks: {...selectedTasks}
    };

    if (editingSubJob !== null) {
      const updatedSubJobs = [...subJobs];
      updatedSubJobs[editingSubJob] = subJobDetails;
      setSubJobs(updatedSubJobs);
      setEditingSubJob(null);
    } else {
      setSubJobs((prev) => [...prev, subJobDetails]);
    }

    const currentSubJobId = parseInt(formData.subJobId) || 0;
    setFormData((prev) => ({
      ...prev,
      subJobId: String(
        editingSubJob !== null ? currentSubJobId : currentSubJobId + 1
      ),
      color: "",
      cardSize: "",
      cardQty: "",
      itemQty: "",
      description: "",
    }));
    
    setSelectedTasks({});
    
    // Scroll to the bottom of the sub jobs table after adding a new item
    setTimeout(() => {
      if (subJobsTableRef.current) {
        subJobsTableRef.current.scrollTop = subJobsTableRef.current.scrollHeight;
      }
    }, 100);
  };

  
  const handleDeleteSubJob = (index) => {
    const updatedSubJobs = subJobs.filter((_, i) => i !== index);
    setSubJobs(updatedSubJobs);
    if (updatedSubJobs.length === 0) {
      setFormData((prev) => ({ ...prev, subJobId: "1" }));
    }
  };

  const handleEditSubJob = (index) => {
    const subJobToEdit = subJobs[index];
    setFormData((prev) => ({
      ...prev,
      subJobId: subJobToEdit.subJobId,
      color: subJobToEdit.color,
      cardSize: subJobToEdit.cardSize,
      cardQty: subJobToEdit.cardQty.toString(),
      itemQty: subJobToEdit.itemQty.toString(),
      description: subJobToEdit.description,
    }));
    setSelectedTasks(subJobToEdit.selectedTasks || {});
    setEditingSubJob(index);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // Transform the data to match backend expectations
      const requestData = {
        job_id: formData.jobId,
        customer_name: formData.customer,
        start_date: formData.startDate,
        required_date: formData.requiredDate,
        user_uid: userUID,
        sub_jobs: subJobs.map(subJob => ({
          sub_job_id: subJob.subJobId,
          color: subJob.color,
          card_size: subJob.cardSize,
          card_quantity: subJob.cardQty,
          item_quantity: subJob.itemQty,
          description: subJob.description,
          // Send selected processes
          processes: subJob.selectedTasks || {}
        }))
      };
      
      console.log('Sending data to backend:', JSON.stringify(requestData, null, 2));
  
      const response = await fetch("/api/submit-job", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestData),
      });
  
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to submit");
  
      alert("✅ Job card successfully submitted");
      console.log("Job created:", data);
  
      // Reset form after successful submission
      setFormData({
        jobId: "",
        customer: "",
        startDate: "",
        requiredDate: "",    
        subJobId: "1",
        color: "",
        cardSize: "",
        cardQty: "",
        itemQty: "",
        description: "",
        Printing: false,
      });
      setSubJobs([]);
      setSelectedTasks({});
  
    } catch (error) {
      console.error("Error submitting job card:", error);
      alert("❌ Error: " + error.message);
    }
  };
  
  

  const handlePageChange = (page) => {
    setActivePage(page);
    setIsMenuOpen(false);
    
    if (page === "Printing") {
      setShowMachineForm(true);
      setShowPrintingModal(false);
    } else {
      setShowMachineForm(false);
      setShowPrintingModal(false);
    }
  };

  if (!userRole) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  if (userRole !== "admin") {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <RoleBasedNavbar />

      <div className="flex flex-1 items-start justify-center p-3">
        
        <form
          onSubmit={handleSubmit}
          className="bg-white shadow-lg rounded-lg p-4 w-full max-w-6xl text-black relative"
        >
          {/* Navbar inside form - UPDATED WITH ROLE-BASED ACCESS */}


          {/* Mobile Menu - UPDATED WITH ROLE-BASED ACCESS */}
          {isMenuOpen && (
            <div className="absolute left-0 top-0 h-full w-64 bg-white shadow-xl z-50 border-r border-gray-200 overflow-y-auto">
              <div className="p-3">
                {getAllowedPages(userRole).map((page) => (
                  <button
                    key={page}
                    type="button"
                    onClick={() => handlePageChange(page)}
                    className={`block w-full text-left px-4 py-2 my-1 hover:bg-blue-100 rounded ${
                      activePage === page
                        ? "bg-blue-200 text-black font-medium"
                        : "text-gray-800"
                    }`}
                  >
                    {page}
                  </button>
                ))}

                {/* Only show additional menu items for admin */}
                {userRole === "admin" && (
                  <>
                    <div className="border-t border-gray-300 my-2"></div>
                    {additionalMenuItems.map((item) => (
                      <button
                        key={item}
                        type="button"
                        onClick={() => {
                          console.log(item + " clicked");
                          setIsMenuOpen(false);
                        }}
                        className="block w-full text-left px-4 py-2 my-1 hover:bg-blue-100 rounded text-gray-800"
                      >
                        {item}
                      </button>
                    ))}
                  </>
                )}
              </div>
            </div>
          )}

          {/* Form Content */}
          <div
            className={`transition-all ${
              isMenuOpen ? "md:ml-64" : ""
            } flex flex-col`}
          >
            {/* Left Section - Form Fields */}
            <div className="flex-1">
              {/* Top Section */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3">
                <div className="flex items-center gap-3 mb-2 text-black">
                  <label htmlFor="jobId" className="w-24 text-sm font-medium text-black">
                    Job ID
                  </label>
                  <input
                    id="jobId"
                    name="jobId"
                    type="text"
                    autoComplete="off"
                    value={formData.jobId}
                    onChange={handleChange}
                    className="border border-black rounded px-2 py-1 flex-1 text-black text-sm h-8"
                  />
                </div>

                <div className="flex items-center gap-3 mb-2 text-black">
                  <label htmlFor="customer" className="w-24 text-sm font-medium text-black">
                    Customer
                  </label>
                  <input
                    id="customer"
                    name="customer"
                    type="text"
                    autoComplete="off"
                    value={formData.customer}
                    onChange={handleChange}
                    className="border border-black rounded px-2 py-1 flex-1 text-black text-sm h-8"
                  />
                </div>

                <div className="flex items-center gap-3 mb-2 text-black">
                  <label htmlFor="startDate" className="w-24 text-sm font-medium text-black">
                    Start Date
                  </label>
                  <input
                    id="startDate"
                    name="startDate"
                    type="date"
                    value={formData.startDate}
                    onChange={handleChange}
                    className="border border-black rounded px-2 py-1 flex-1 text-black text-sm h-8"
                  />
                </div>

                <div className="flex items-center gap-3 mb-2 text-black">
                  <label htmlFor="requiredDate" className="w-24 text-sm font-medium text-black">
                    Required Date
                  </label>
                  <input
                    id="requiredDate"
                    name="requiredDate"
                    type="date"
                    value={formData.requiredDate}
                    onChange={handleChange}
                    className="border border-black rounded px-2 py-1 flex-1 text-black text-sm h-8"
                  />
                </div>
              </div>

              {/* Divider */}
              <div className="border-t my-4"></div>

              {/* Sub Job Section */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3">
                <div className="flex items-center gap-3 mb-2 text-black">
                  <label htmlFor="subJobId" className="w-24 text-sm font-medium text-black">
                    Sub Job ID
                  </label>
                  <input
                    id="subJobId"
                    name="subJobId"
                    type="text"
                    autoComplete="off"
                    value={formData.subJobId}
                    onChange={handleChange}
                    className="border border-black rounded px-2 py-1 flex-1 text-black text-sm h-8"
                  />
                </div>

                <div className="flex items-center gap-3 mb-2 text-black">
                  <label htmlFor="color" className="w-24 text-sm font-medium text-black">
                    Color
                  </label>
                  <input
                    id="color"
                    name="color"
                    type="text"
                    autoComplete="off"
                    value={formData.color}
                    onChange={handleChange}
                    className="border border-black rounded px-2 py-1 flex-1 text-black text-sm h-8"
                  />
                </div>

                <div className="flex items-center gap-3 mb-2 text-black">
                  <label htmlFor="cardSize" className="w-24 text-sm font-medium text-black">
                    Card Size
                  </label>
                  <input
                    id="cardSize"
                    name="cardSize"
                    type="text"
                    autoComplete="off"
                    value={formData.cardSize}
                    onChange={handleChange}
                    className="border border-black rounded px-2 py-1 flex-1 text-black text-sm h-8"
                  />
                </div>

                <div className="flex items-center gap-3 mb-2 text-black">
                  <label htmlFor="cardQty" className="w-24 text-sm font-medium text-black">
                    Card Qty
                  </label>
                  <input
                    id="cardQty"
                    name="cardQty"
                    type="number"
                    value={formData.cardQty}
                    onChange={handleChange}
                    className="border border-black rounded px-2 py-1 flex-1 text-black text-sm h-8"
                  />
                </div>

                <div className="flex items-center gap-3 mb-2 text-black">
                  <label htmlFor="itemQty" className="w-24 text-sm font-medium text-black">
                    Item Qty
                  </label>
                  <input
                    id="itemQty"
                    name="itemQty"
                    type="number"
                    value={formData.itemQty}
                    onChange={handleChange}
                    className="border border-black rounded px-2 py-1 flex-1 text-black text-sm h-8"
                  />
                </div>

                <div className="flex items-start gap-3 mb-2 text-black">
                  <label htmlFor="description" className="w-24 text-sm font-medium text-black pt-2">
                    Description
                  </label>
                  <textarea
                    id="description"
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    rows={3}
                    className="border border-black rounded px-2 py-1 flex-1 text-black text-sm"
                  />
                </div>
              </div>

              {/* Checkboxes Section */}
              <div className="pt-4 mt-4">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2 text-black">
                  {processesList.map((processName) => (
                    <label key={processName} className="flex items-center gap-2 text-black text-sm">
                      <input
                        type="checkbox"
                        checked={selectedTasks[processName] || false}
                        onChange={() => handleTaskChange(processName)}
                        className="w-4 h-4"
                      />
                      <span>{processName}</span>
                    </label>
                  ))}
                  {/* Printing Checkbox */}
                  <label className="flex items-center gap-2 text-black text-sm">
                    <input
                      type="checkbox"
                      name="Printing"
                      checked={formData.Printing || false}cd
                      onChange={handleChange}
                      className="w-4 h-4"
                    />
                    <span>Select Machine for Printing</span>
                  </label>
                </div>
              </div>

              {/* Add Sub Job Button */}
              <div className="flex justify-end mt-4">
                <button
                  type="button"
                  onClick={handleAddSubJob}
                  className="bg-blue-500 text-white px-4 py-1.5 rounded text-sm hover:bg-blue-600"
                >
                  {editingSubJob !== null ? "UPDATE SUB JOB" : "ADD SUB JOB"}
                </button>
              </div>

              {/* Sub Jobs Table - Moved below checkboxes */}

              {subJobs.length > 0 && (
                <div
                  ref={subJobsTableRef}
                  className="mt-6 bg-gray-50 p-3 rounded border border-gray-200"
                >
                  {/* Heading Sticky */}
                  <h3 className="text-sm font-semibold mb-3 text-center sticky top-0 bg-gray-50 py-2 z-20">
                    Sub Jobs Details
                  </h3>

                  {/* Scroll 3 rows ke baad hi */}
                  <div
                    className={`overflow-x-auto ${
                      subJobs.length > 3 ? "max-h-[160px] overflow-y-auto" : ""
                    }`}
                  >
                    <table className="min-w-full border-collapse bg-white">
                      <thead className="sticky top-0 bg-gray-200 z-10">
                        <tr className="text-gray-700 text-sm">
                          <th className="py-2 px-3 text-left border-b border-gray-300">
                            Sub Job ID
                          </th>
                          <th className="py-2 px-3 text-left border-b border-gray-300">
                            Item Qty
                          </th>
                          <th className="py-2 px-3 text-left border-b border-gray-300">
                            Description
                          </th>
                          <th className="py-2 px-3 text-left border-b border-gray-300">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {subJobs.map((job, index) => (
                          <tr
                            key={index}
                            className="border-b border-gray-200 hover:bg-gray-100 text-sm"
                          >
                            <td className="py-2 px-3">{job.subJobId}</td>
                            <td className="py-2 px-3">{job.itemQty}</td>
                            <td
                              className="py-2 px-3 max-w-xs truncate"
                              title={job.description}
                            >
                              {job.description || "N/A"}
                            </td>
                            <td className="py-2 px-3">
                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleEditSubJob(index)}
                                  className="bg-yellow-500 text-white px-2 py-1 rounded text-xs hover:bg-yellow-600"
                                >
                                  Edit
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteSubJob(index)}
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
                </div>
              )}

              <div className="border-t my-4"></div>

              {/* Main Submit Button */}
              <div className="flex justify-end mt-4">
                <button
                  type="submit"
                  className="bg-blue-500 text-white px-8 py-1.5 rounded text-sm hover:bg-blue-600"
                >
                  SUBMIT JOB CARD
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>

      {/* Printing Modal (for checkbox) */}
      {showPrintingModal && (
        <div className="fixed inset-0 bg-black/20 flex justify-center items-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-4 w-full max-w-4xl relative">
            <div className="bg-blue-500 text-white py-2 px-4 rounded-t-lg -mt-4 -mx-4 mb-4">
              <div className="flex justify-between items-center">
                <h1 className="text-lg font-semibold">Printing Details</h1>
                <button
                  type="button"
                  onClick={() => {
                    setShowPrintingModal(false);
                    setFormData((prev) => ({ ...prev, Printing: false }));
                  }}
                  className="text-white hover:text-gray-200 text-xl"
                >
                  ×
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {machines.map((machine) => (
                <div
                  key={machine.id}
                  className={`border rounded p-3 shadow transition duration-200 ${
                    selectedMachines.includes(machine.id)
                      ? "border-blue-500"
                      : "border-gray-300"
                  }`}
                >
                  <div className="flex justify-between items-center mb-2">
                    <h2 className="text-base font-semibold text-black">
                      {machine.name}
                    </h2>
                    <input
                      type="checkbox"
                      checked={selectedMachines.includes(machine.id)}
                      onChange={() => toggleMachine(machine.id)}
                      className="h-4 w-4 text-blue-500"
                    />
                  </div>
                  <div className="space-y-1 text-sm text-black">
                    <p>
                    <strong>Size:</strong> {machine.size}
                    </p>
                    <p>
                      <strong>Capacity:</strong> {machine.capacity}
                    </p>
                    <p>
                      
                      <strong>Desc:</strong> {machine.description}
                    </p>
                    <p>
                      <strong>Days:</strong> {machine.available_days}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end mt-4 gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowPrintingModal(false);
                  setFormData((prev) => ({ ...prev, Printing: false }));
                }}
                className="bg-gray-500 text-white px-5 py-1.5 rounded text-sm hover:bg-gray-600"
              >
                CANCEL
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowPrintingModal(false);
                  setFormData((prev) => ({ ...prev, Printing: true }));
                }}
                className="bg-blue-500 text-white px-5 py-1.5 rounded text-sm hover:bg-blue-600"
              >
                SUBMIT
              </button>
            </div>
            </div>
        </div>
      )}

      {/* Machine Info Modal (for navbar Printing button) */}
      {showMachineForm && (
        <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50">
          <div className="relative w-full max-w-sm mx-auto bg-white rounded-xl shadow-xl border border-blue-100 overflow-hidden">
            {/* Header */}
            <div className="bg-blue-500 p-4 text-center">
              <h2 className="text-lg font-semibold text-white tracking-wide">
                Machine Info
              </h2>
            </div>
            {/* Form */}
            <form onSubmit={handleMachineFormSubmit} className="p-5 space-y-4 text-gray-900">
              <div>
                <label className="block text-sm font-medium mb-1">Name:</label>
                <input
                  type="text"
                  name="name"
                  value={machineFormData.name}
                  onChange={handleMachineFormChange}
                  className="w-full px-3 py-2 text-sm text-gray-900 border border-black rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                  placeholder="e.g., HB-01"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Size:</label>
                  <input
                    type="text"
                    name="size"
                    value={machineFormData.size}
                    onChange={handleMachineFormChange}
                    className="w-full px-3 py-2 text-sm text-gray-900 border border-black rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                    placeholder="e.g., 20x30"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Capacity:</label>
                  <input
                    type="text"
                    name="capacity"
                    value={machineFormData.capacity}
                    onChange={handleMachineFormChange}
                    className="w-full px-3 py-2 text-sm text-gray-900 border border-black rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                    placeholder="e.g., 1200"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Description:</label>
                <textarea
                  className="w-full px-3 py-2 text-sm text-gray-900 border border-black rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
                  placeholder="Short description"
                  rows="2"
                  name="description"
                  value={machineFormData.description}
                  onChange={handleMachineFormChange}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Available Days:</label>
                <input
                  type="text"
                  name="availableDays"
                  value={machineFormData.availableDays}
                  onChange={handleMachineFormChange}
                  className="w-full px-3 py-2 text-sm text-gray-900 border border-black rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                  placeholder="e.g., 5"
                />
              </div>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowMachineForm(false)}
                  className="bg-gray-500 text-white py-2 px-4 rounded-lg hover:bg-gray-600 transition duration-200 text-sm font-medium shadow-md"
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  className="bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600 transition duration-200 text-sm font-medium shadow-md"
                >
                  SUBMIT
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}