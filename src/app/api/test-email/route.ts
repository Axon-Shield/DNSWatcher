import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { to, subject, text, html } = await request.json();
    
    if (!to || !subject || !text) {
      return NextResponse.json({ message: 'Missing required fields: to, subject, text' }, { status: 400 });
    }
    
    console.log('Testing email system...');
    
    // Call the Edge Function to send email
    const emailResponse = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/send-email`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        to,
        subject,
        text,
        html
      })
    });
    
    if (!emailResponse.ok) {
      const errorText = await emailResponse.text();
      console.error('Email service error:', errorText);
      return NextResponse.json({ 
        message: 'Failed to send email', 
        error: errorText 
      }, { status: 500 });
    }
    
    const result = await emailResponse.json();
    console.log('Email sent successfully:', result);
    
    return NextResponse.json({
      message: 'Email sent successfully',
      result,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Email test error:', error);
    return NextResponse.json({
      message: 'Email test failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
