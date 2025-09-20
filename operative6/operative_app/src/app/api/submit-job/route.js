import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase-server';
import { supabase } from '@/lib/supabaseClient'


export async function POST(request) {
  try {
    const body = await request.json();
    console.log('Received data:', body);

    // 1. Insert into job_cards
    const { data: jobData, error: jobError } = await supabase
      .from('job_cards')
      .insert({
        job_id: body.job_id, // 👈 human-readable frontend se
        customer_name: body.customer_name,
        start_date: body.start_date,
        required_date: body.required_date,
        // job_code auto generate hoga (UUID, DB default)
      })
      .select()
      .single();

    if (jobError) {
      console.error('Job card error:', jobError);
      return NextResponse.json({ error: jobError.message }, { status: 500 });
    }

    // Agar sub_jobs nahi hain to return kar do
    if (!body.sub_jobs || body.sub_jobs.length === 0) {
      return NextResponse.json(
        {
          message: 'Job card created successfully (no sub jobs)',
          job_id: jobData.job_id, // human-readable
          job_code: jobData.job_code, // UUID
        },
        { status: 201 }
      );
    }

    // 2. Insert into sub_job_cards
    const subJobsToInsert = body.sub_jobs.map((sub) => ({
      sub_job_id: sub.sub_job_id, // 👈 human-readable frontend se
      job_id: jobData.job_id, // human-readable
      job_code: jobData.job_code, // UUID (FK link)
      description: sub.description,
      color: sub.color,
      card_size: sub.card_size,
      card_quantity: sub.card_quantity,
      item_quantity: sub.item_quantity,
      // sub_job_code DB me auto UUID generate hoga
    }));

    console.log('Sub jobs to insert:', subJobsToInsert);

    const { data: subJobData, error: subJobError } = await supabase
      .from('sub_job_cards')
      .insert(subJobsToInsert)
      .select();

    if (subJobError) {
      console.error('Sub job error:', subJobError);
      return NextResponse.json({ error: subJobError.message }, { status: 500 });
    }

    console.log('Sub jobs created successfully:', subJobData);

    // 3. Process the selected tasks for each sub job
    const jobProcesses = [];

    for (const subJob of body.sub_jobs) {
      if (subJob.processes) {
        const selectedProcesses = Object.entries(subJob.processes)
          .filter(([_, isSelected]) => isSelected)
          .map(([processName]) => processName);

        console.log(
          'Selected processes for sub job:',
          subJob.sub_job_id,
          selectedProcesses
        );

        if (selectedProcesses.length > 0) {
          const { data: processesData, error: processesError } = await supabase
            .from('processes')
            .select('process_id, process_name')
            .in('process_name', selectedProcesses);

          if (processesError) {
            console.error('Processes error:', processesError);
            continue;
          }

          console.log('Found processes in DB:', processesData);

          const insertedSubJob = subJobData.find(
            (sj) => sj.sub_job_id === subJob.sub_job_id
          );

          if (insertedSubJob) {
            for (const process of processesData) {
              jobProcesses.push({
                sub_job_id: insertedSubJob.sub_job_id, // human-readable
                job_id: jobData.job_id, // human-readable
                process_id: process.process_id,
                status: 'pending',
              });
            }
          }
        }
      }
    }

    // 4. Insert all job_processes entries
    if (jobProcesses.length > 0) {
      console.log('Inserting job processes:', jobProcesses);

      const { error: jobProcessError } = await supabase
        .from('job_processes')
        .insert(jobProcesses);

      if (jobProcessError) {
        console.error('Job process error:', jobProcessError);
        return NextResponse.json(
          { error: jobProcessError.message },
          { status: 500 }
        );
      }
    }

    return NextResponse.json(
      {
        message: 'Job card created successfully',
        job_id: jobData.job_id, // human-readable
        job_code: jobData.job_code, // UUID
        sub_jobs_count: subJobData.length,
        processes_count: jobProcesses.length,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
