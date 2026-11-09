package com.eduvault.controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class SpaForwardController {

    @GetMapping(value = {
        "/dashboard",
        "/dashboard/**",
        "/landing",
        "/notes",
        "/notes/**",
        "/pyqs",
        "/roadmaps",
        "/ai-assistant",
        "/announcements",
        "/attendance",
        "/optimization",
        "/settings"
    })
    public String forward() {
        return "forward:/index.html";
    }

    @GetMapping("/privacy")
    public String privacy() {
        return "forward:/privacy.html";
    }

    @GetMapping("/terms")
    public String terms() {
        return "forward:/terms.html";
    }
}
