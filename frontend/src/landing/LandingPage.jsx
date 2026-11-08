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
        agenda={null}
        register={{ label: "Sign In", href: "#login" }}
        cta={{
          kicker: "Access Portal",
          title: "Own your semester.",
          subtitle: "Connect your timetable, run instant neural searches across past question papers, and protect your 75% attendance threshold with automated bunk intelligence and real-time ERP synchronization."
        }}
        footer={{ note: "© 2026 CampusAxis · EduVault. All rights reserved." }}
      />
    </div>
  );
}
