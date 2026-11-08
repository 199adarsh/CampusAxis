import React from 'react';
import OnwardSummitTemplate from './onward-summit-template';

export default function LandingPage() {
  return (
    <div className="relative w-full min-h-screen">
      <OnwardSummitTemplate
        brand="CampusAxis"
        title="CampusAxis"
        tagline={"The definitive operating system\nfor modern student life"}
        register={{ label: "Go to Dashboard", href: "/dashboard" }}
        footer={{ note: "© 2026 CampusAxis · EduVault. All rights reserved." }}
      />
    </div>
  );
}
