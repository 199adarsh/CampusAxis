import React, { useEffect } from 'react';
import OnwardSummitTemplate from './onward-summit-template';

export default function LandingPage() {
  useEffect(() => {
    document.documentElement.classList.add('hide-scrollbar');
    document.body.classList.add('hide-scrollbar');
    return () => {
      document.documentElement.classList.remove('hide-scrollbar');
      document.body.classList.remove('hide-scrollbar');
    };
  }, []);

  return (
    <div className="relative w-full min-h-screen">
      <OnwardSummitTemplate
        brand="CampusAxis"
        title="CampusAxis"
        tagline={"Connecting every part of campus!"}
        register={{ label: "Go to Dashboard", href: "/dashboard" }}
        footer={{ note: "© 2026 CampusAxis · EduVault. All rights reserved." }}
      />
    </div>
  );
}
