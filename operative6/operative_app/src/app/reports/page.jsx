"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase-browser";
import PageLayout from "@/components/PageLayout";

export default function Reports() {
  const [reports, setReports] = useState([]);
  const [allReports, setAllReports] = useState([]); // Store all reports for filtering
  const [filter, setFilter] = useState("all");
  const [selectedJob, setSelectedJob] = useState(null);
  const [jobDetails, setJobDetails] = useState(null);
  const [subJobs, setSubJobs] = useState([]);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [processNames, setProcessNames] = useState({});
  const [subJobDescriptions, setSubJobDescriptions] = useState({});
  const [userEmployeeCode, setUserEmployeeCode] = useState("");
  const [searchTerm, setSearchTerm] = useState(""); // Search term state
  const [customerNames, setCustomerNames] = useState({}); // Store customer names by job ID

  // Get current user's employee code
  const getUserEmployeeCode = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('employee_code')
          .eq('id', user.id)
          .single();
        
        if (error) {
          console.error("Error fetching profile:", error);
          return;
        }
        
        if (profile && profile.employee_code) {
          setUserEmployeeCode(profile.employee_code);
          console.log("User employee code:", profile.employee_code);
        } else {
          console.error("No employee code found for user");
        }
      }
    } catch (err) {
      console.error("Error getting user employee code:", err);
    }
  };

  // Fetch process names from processes table
  const fetchProcessNames = async () => {
    try {
      const { data, error } = await supabase
        .from("processes")
        .select("process_id, process_name");

      if (error) {
        console.error("Error fetching process names:", error);
        return;
      }

      const processMap = {};
      data.forEach(process => {
        processMap[process.process_id] = process.process_name;
      });
      setProcessNames(processMap);
    } catch (err) {
      console.error("Error in fetchProcessNames:", err);
    }
  };

  // Fetch sub job descriptions from sub_job_cards table
  const fetchSubJobDescriptions = async () => {
    try {
      const { data, error } = await supabase
        .from("sub_job_cards")
        .select("sub_job_id, description");

      if (error) {
        console.error("Error fetching sub job descriptions:", error);
        return;
      }

      const descriptionMap = {};
      data.forEach(subJob => {
        descriptionMap[subJob.sub_job_id] = subJob.description;
      });
      setSubJobDescriptions(descriptionMap);
    } catch (err) {
      console.error("Error in fetchSubJobDescriptions:", err);
    }
  };

  // Fetch customer names from job_cards table
  const fetchCustomerNames = async (jobIds) => {
    try {
      if (jobIds.length === 0) return;
      
      const { data, error } = await supabase
        .from("job_cards")
        .select("job_id, customer_name")
        .in("job_id", jobIds);

      if (error) {
        console.error("Error fetching customer names:", error);
        return;
      }

      const customerMap = {};
      data.forEach(job => {
        customerMap[job.job_id] = job.customer_name;
      });
      setCustomerNames(customerMap);
    } catch (err) {
      console.error("Error in fetchCustomerNames:", err);
    }
  };

  // Fetch reports from job_processes
  const fetchReports = async () => {
    try {
      const { data, error } = await supabase
        .from("job_processes")
        .select("*")
        .order("updated_at", { ascending: false });

      if (error) {
        console.error("Error fetching reports:", error);
        return;
      }

      console.log("Fetched reports:", data);

      const mapped = data.map((row) => ({
        id: row.id,
        jobId: row.job_id,
        subJobId: row.sub_job_id,
        processId: row.process_id,
        status: row.status,
        employeeCode: row.employee_code,
        updatedAt: row.updated_at,
        completedBy: row.status === "completed" && row.employee_code 
          ? `${row.employee_code} (${new Date(row.updated_at).toLocaleString()})` 
          : "Not completed"
      }));

      setReports(mapped);
      setAllReports(mapped); // Store all reports for filtering
      
      // Extract unique job IDs for fetching customer names
      const uniqueJobIds = [...new Set(mapped.map(report => report.jobId))];
      fetchCustomerNames(uniqueJobIds);
    } catch (err) {
      console.error("Error in fetchReports:", err);
    }
  };

  // Search functionality
  const handleSearch = (term) => {
    setSearchTerm(term);
    
    if (!term.trim()) {
      setReports(allReports);
      return;
    }

    const filtered = allReports.filter(report => 
      report.jobId.toLowerCase().includes(term.toLowerCase()) ||
      (customerNames[report.jobId] && 
       customerNames[report.jobId].toLowerCase().includes(term.toLowerCase()))
    );
    
    setReports(filtered);
  };

  // Fetch job + subjob details
  const fetchDetails = async (jobId) => {
    setLoadingDetails(true);
    setJobDetails(null);
    setSubJobs([]);

    try {
      // Job details
      const { data: job, error: jobError } = await supabase
        .from("job_cards")
        .select("*")
        .eq("job_id", jobId)
        .single();

      if (jobError) {
        console.error("Error fetching job details:", jobError);
        setLoadingDetails(false);
        return;
      }
      setJobDetails(job);

      // Sub jobs details
      const { data: subJobsData, error: subError } = await supabase
        .from("sub_job_cards")
        .select("*")
        .eq("job_id", jobId);

      if (subError) {
        console.error("Error fetching sub jobs:", subError);
        setLoadingDetails(false);
        return;
      }
      setSubJobs(subJobsData || []);
    } catch (err) {
      console.error("Unexpected error:", err);
    }

    setLoadingDetails(false);
  };

  // Undo status from completed to pending
  const undoStatus = async (jobId, subJobId, processId, recordId) => {
    try {
      console.log("Undoing status for record:", recordId);
      
      const { error } = await supabase
        .from("job_processes")
        .update({ 
          status: "pending",
          updated_at: new Date().toISOString(),
          employee_code: null
        })
        .eq("id", recordId);

      if (error) {
        console.error("Error updating status:", error);
        alert("Error undoing status: " + error.message);
        return;
      }

      console.log("Status updated successfully");
      alert("Status changed to pending successfully!");
      
      // Refresh reports after update
      fetchReports();
    } catch (err) {
      console.error("Error in undo operation:", err);
      alert("Error: " + err.message);
    }
  };

  // Complete status from pending to completed
  const completeStatus = async (jobId, subJobId, processId, recordId) => {
    try {
      console.log("Completing status for record:", recordId, "by employee:", userEmployeeCode);
      
      // Ensure we have employee code
      if (!userEmployeeCode) {
        await getUserEmployeeCode();
        if (!userEmployeeCode) {
          alert("Error: Could not identify your employee code. Please refresh the page.");
          return;
        }
      }

      const updateData = { 
        status: "completed",
        updated_at: new Date().toISOString(),
        employee_code: userEmployeeCode
      };

      console.log("Update data:", updateData);

      const { error } = await supabase
        .from("job_processes")
        .update(updateData)
        .eq("id", recordId);

      if (error) {
        console.error("Error updating status:", error);
        alert("Error completing status: " + error.message);
        return;
      }

      console.log("Status completed successfully");
      alert("Status changed to completed successfully!");
      
      // Refresh reports after update
      fetchReports();
    } catch (err) {
      console.error("Error in complete operation:", err);
      alert("Error: " + err.message);
    }
  };

  // Initial fetch
  useEffect(() => {
    getUserEmployeeCode();
    fetchProcessNames();
    fetchSubJobDescriptions();
    fetchReports();

    const channel = supabase
      .channel("reports-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "job_processes" },
        (payload) => {
          console.log("Realtime update received:", payload);
          fetchReports();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Group reports by jobId and subJobId
  const groupedReports = reports.reduce((acc, report) => {
    if (!acc[report.jobId]) {
      acc[report.jobId] = {};
    }
    if (!acc[report.jobId][report.subJobId]) {
      acc[report.jobId][report.subJobId] = [];
    }
    acc[report.jobId][report.subJobId].push(report);
    return acc;
  }, {});

  // Filter reports based on status
  const filteredGroupedReports = Object.keys(groupedReports).reduce((acc, jobId) => {
    const jobData = groupedReports[jobId];
    const filteredJob = {};
    
    Object.keys(jobData).forEach(subJobId => {
      const filteredSubJobs = jobData[subJobId].filter(
        (r) => filter === "all" || r.status?.toLowerCase() === filter
      );
      
      if (filteredSubJobs.length > 0) {
        filteredJob[subJobId] = filteredSubJobs;
      }
    });
    
    if (Object.keys(filteredJob).length > 0) {
      acc[jobId] = filteredJob;
    }
    
    return acc;
  }, {});

  return (
    <PageLayout title="Reports">
      <div className="p-6">
        {/* Search and Filter Section */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          {/* Search Input */}
          <div className="flex-1">
            <div className="relative">
              <input
                type="text"
                placeholder="Search by Job ID or Customer Name..."
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
                className="w-full px-4 py-2 text-blue-500 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <div className="absolute right-3 top-2.5">
                <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="flex gap-2">
            {["all", "pending", "completed"].map((tab) => (
              <button
                key={tab}
                className={`px-4 py-2 rounded-full font-medium transition ${
                  filter === tab
                    ? "bg-blue-500 text-white"
                    : "bg-blue-200 text-blue-700 hover:bg-blue-300"
                }`}
                onClick={() => setFilter(tab)}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Reports Table */}
        <div className="bg-white rounded-lg border border-blue-200 overflow-hidden">
          {/* Header Row - Updated to 9 columns */}
          <div className="grid grid-cols-9 bg-blue-100 p-4 font-semibold text-blue-700 border-b border-blue-200">
            <div>Job ID</div>
            <div>Customer</div>
            <div>Sub Job</div>
            <div>Description</div>
            <div>Process</div>
            <div>Status</div>
            <div>Completed By</div>
            <div>Actions</div>
            <div>Details</div>
          </div>

          {/* Data Rows */}
          {Object.keys(filteredGroupedReports).length === 0 ? (
            <div className="p-8 text-center text-blue-500">
              {searchTerm ? `No results found for "${searchTerm}"` : "No reports found for the selected filter."}
            </div>
          ) : (
            Object.keys(filteredGroupedReports).map((jobId) => {
              const jobSubJobs = filteredGroupedReports[jobId];
              const subJobIds = Object.keys(jobSubJobs);
              const customerName = customerNames[jobId] || "Loading...";
              
              return (
                <div key={jobId} className="border-b border-blue-100 last:border-b-0">
                  {/* Job Header */}
                  <div className="bg-blue-50 p-3 flex justify-between items-center">
                    <div>
                      <span className="font-semibold text-blue-800">Job ID: {jobId}</span>
                      <span className="ml-4 text-blue-700">Customer: {customerName}</span>
                    </div>
                    <span className="text-sm bg-blue-200 text-blue-800 px-3 py-1 rounded-full">
                      {subJobIds.length} sub-job(s)
                    </span>
                  </div>
                  
                  {/* Sub Jobs */}
                  {subJobIds.map((subJobId) => {
                    const subJobReports = jobSubJobs[subJobId];
                    const description = subJobDescriptions[subJobId] || "No description";
                    
                    return subJobReports.map((report, index) => (
                      <div key={`${subJobId}-${index}`} className="grid grid-cols-9 p-4 items-center hover:bg-blue-50 border-t border-blue-100">
                        {/* Job ID */}
                        <div className="text-sm font-medium text-blue-900">
                          {index === 0 ? jobId : ""}
                        </div>
                        
                        {/* Customer Name */}
                        <div className="text-sm font-medium text-blue-900">
                          {index === 0 ? customerName : ""}
                        </div>
                        
                        {/* Sub Job ID */}
                        <div className="text-sm font-medium text-blue-900">
                          {index === 0 ? subJobId : ""}
                        </div>
                        
                        {/* Description */}
                        <div className="text-sm text-blue-600">
                          {index === 0 ? description : ""}
                        </div>
                        
                        {/* Process */}
                        <div className="text-sm text-blue-900">
                          {processNames[report.processId] || `Process ${report.processId}`}
                        </div>
                        
                        {/* Status */}
                        <div className="flex items-center gap-2">
                          <span className={`px-3 py-1 text-xs rounded-full font-medium ${
                            report.status?.toLowerCase() === "completed"
                              ? "bg-green-100 text-green-800"
                              : "bg-red-100 text-red-800"
                          }`}>
                            {report.status}
                          </span>
                        </div>
                        
                        {/* Completed By */}
                        <div className="text-xs text-blue-500">
                          {report.status === "completed" ? report.completedBy : "Not completed"}
                        </div>
                        
                        {/* Actions */}
                        <div>
                          {report.status?.toLowerCase() === "completed" ? (
                            <button
                              onClick={() => undoStatus(report.jobId, report.subJobId, report.processId, report.id)}
                              className="px-3 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                            >
                              Undo
                            </button>
                          ) : (
                            <button
                              onClick={() => completeStatus(report.jobId, report.subJobId, report.processId, report.id)}
                              className="px-3 py-1 text-xs bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
                            >
                              Complete
                            </button>
                          )}
                        </div>
                        
                        {/* View Details Button */}
                        <div>
                          {index === 0 && (
                            <button
                              onClick={() => {
                                setSelectedJob(jobId);
                                fetchDetails(jobId);
                              }}
                              className="px-3 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                            >
                              View Details
                            </button>
                          )}
                        </div>
                      </div>
                    ));
                  })}
                </div>
              );
            })
          )}
        </div>

        {/* Details Modal (unchanged) */}
        {selectedJob && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] overflow-y-auto">
              {/* Header */}
              <div className="sticky top-0 bg-white border-b border-blue-200 p-6 flex justify-between items-center">
                <h2 className="text-xl font-bold text-blue-900">Job Details</h2>
                <button
                  onClick={() => {
                    setSelectedJob(null);
                    setJobDetails(null);
                    setSubJobs([]);
                  }}
                  className="text-blue-500 hover:text-blue-700 text-2xl"
                >
                  ×
                </button>
              </div>

              {/* Content */}
              <div className="p-6">
                {loadingDetails ? (
                  <div className="flex justify-center items-center py-12">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500"></div>
                  </div>
                ) : (
                  <>
                    {/* Job Details */}
                    {jobDetails && (
                      <div className="mb-8">
                        <h3 className="text-lg font-semibold text-blue-900 mb-4">Job Information</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                          <div className="bg-blue-50 p-4 rounded-lg">
                            <p className="text-sm text-blue-500 mb-1">Customer</p>
                            <p className="font-medium text-blue-900">{jobDetails.customer_name}</p>
                          </div>
                          <div className="bg-blue-50 p-4 rounded-lg">
                            <p className="text-sm text-blue-500 mb-1">Start Date</p>
                            <p className="font-medium text-blue-900">{jobDetails.start_date}</p>
                          </div>
                          <div className="bg-blue-50 p-4 rounded-lg">
                            <p className="text-sm text-blue-500 mb-1">Required Date</p>
                            <p className="font-medium text-blue-900">{jobDetails.required_date}</p>
                          </div>
                          <div className="bg-blue-50 p-4 rounded-lg">
                            <p className="text-sm text-blue-500 mb-1">Created By</p>
                            <p className="font-medium text-blue-900">{jobDetails.created_by}</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Sub Jobs */}
                    <div>
                      <h3 className="text-lg font-semibold text-blue-900 mb-4">Sub Jobs</h3>
                      {subJobs.length === 0 ? (
                        <p className="text-blue-500 text-center py-8">No sub jobs found.</p>
                      ) : (
                        <div className="overflow-x-auto border border-blue-200 rounded-lg">
                          <table className="w-full">
                            <thead className="bg-blue-50">
                              <tr>
                                <th className="px-4 py-3 text-left text-xs font-medium text-blue-500 uppercase">Sub Job ID</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-blue-500 uppercase">Color</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-blue-500 uppercase">Card Size</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-blue-500 uppercase">Card Qty</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-blue-500 uppercase">Item Qty</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-blue-500 uppercase">Description</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-blue-200">
                              {subJobs.map((s, i) => (
                                <tr key={i} className="hover:bg-blue-50">
                                  <td className="px-4 py-3 text-sm text-blue-900">{s.sub_job_id}</td>
                                  <td className="px-4 py-3 text-sm text-blue-900">{s.color}</td>
                                  <td className="px-4 py-3 text-sm text-blue-900">{s.card_size}</td>
                                  <td className="px-4 py-3 text-sm text-blue-900">{s.card_quantity}</td>
                                  <td className="px-4 py-3 text-sm text-blue-900">{s.item_quantity}</td>
                                  <td className="px-4 py-3 text-sm text-blue-900">{s.description}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>

              {/* Footer */}
              <div className="sticky bottom-0 bg-white border-t border-blue-200 p-4">
                <div className="flex justify-end">
                  <button
                    onClick={() => {
                      setSelectedJob(null);
                      setJobDetails(null);
                      setSubJobs([]);
                    }}
                    className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </PageLayout>
  );
}