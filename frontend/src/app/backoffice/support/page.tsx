"use client";

import { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Paper,
  Grid,
  Button,
  Stack,
  alpha,
  useTheme,
  CircularProgress,
  IconButton,
} from "@mui/material";
import {
  Email as EmailIcon,
  Phone as PhoneIcon,
  SupportAgent as SupportIcon,
  HelpOutlined as FAQIcon,
  Chat as ChatIcon,
  ChevronRight as ChevronRightIcon,
  Facebook as FacebookIcon,
  Twitter as TwitterIcon,
  LinkedIn as LinkedInIcon,
} from "@mui/icons-material";
import { systemService, SupportSettings } from "@/services/systemService";
import { useToast } from "@/context/ToastContext";

export default function SupportPage() {
  const theme = useTheme();
  const { showError } = useToast();
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<SupportSettings | null>(null);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const data = await systemService.getSupportSettings();
        setSettings(data);
      } catch (err) {
        showError("Error", "Failed to load support information.");
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, [showError]);

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "60vh" }}>
        <CircularProgress />
      </Box>
    );
  }

  const supportEmail = settings?.email || "support@mario.com";
  const supportPhone = settings?.phone || "+91 99999 99999";

  return (
    <Box sx={{ maxWidth: 1000, mx: "auto", py: 4 }}>
      {/* Header Section */}
      <Box sx={{ textAlign: "center", mb: 6 }}>
        <Typography
          variant="h3"
          sx={{
            fontWeight: 900,
            color: theme.palette.text.primary,
            mb: 2,
            letterSpacing: "-0.02em",
          }}
        >
          How can we help you?
        </Typography>
        <Typography variant="h6" color="text.secondary" sx={{ fontWeight: 500 }}>
          Everything you need to get the most out of Mario POS
        </Typography>
      </Box>

      <Grid container spacing={4}>
        {/* Contact Cards */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper
            sx={{
              p: 4,
              height: "100%",
              borderRadius: '0.65rem',
              background: `linear-gradient(135deg, #ffffff 0%, ${alpha(theme.palette.primary.main, 0.03)} 100%)`,
              border: `1px solid ${alpha(theme.palette.primary.main, 0.08)}`,
              boxShadow: "0 20px 40px rgba(0,0,0,0.02)",
              transition: "transform 0.3s ease, box-shadow 0.3s ease",
              "&:hover": {
                transform: "translateY(-5px)",
                boxShadow: `0 30px 60px ${alpha(theme.palette.primary.main, 0.08)}`,
              },
            }}
          >
            <Box
              sx={{
                width: 60,
                height: 60,
                borderRadius: '0.65rem',
                bgcolor: alpha(theme.palette.primary.main, 0.1),
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                mb: 3,
              }}
            >
              <EmailIcon color="primary" sx={{ fontSize: 30 }} />
            </Box>
            <Typography variant="h5" sx={{ fontWeight: 800, mb: 1 }}>
              Email Support
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 4, lineHeight: 1.6 }}>
              Our support team typically responds within 2 hours during business hours.
            </Typography>
            <Button
              variant="contained"
              fullWidth
              component="a"
              href={`mailto:${supportEmail}`}
              sx={{
                py: 1.5,
                borderRadius: '0.65rem',
                fontWeight: 800,
                fontSize: "1rem",
                boxShadow: `0 8px 20px ${alpha(theme.palette.primary.main, 0.25)}`,
              }}
            >
              Email Us: {supportEmail}
            </Button>
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <Paper
            sx={{
              p: 4,
              height: "100%",
              borderRadius: '0.65rem',
              background: `linear-gradient(135deg, #ffffff 0%, ${alpha(theme.palette.secondary.main, 0.03)} 100%)`,
              border: `1px solid ${alpha(theme.palette.secondary.main, 0.08)}`,
              boxShadow: "0 20px 40px rgba(0,0,0,0.02)",
              transition: "transform 0.3s ease, box-shadow 0.3s ease",
              "&:hover": {
                transform: "translateY(-5px)",
                boxShadow: `0 30px 60px ${alpha(theme.palette.secondary.main, 0.08)}`,
              },
            }}
          >
            <Box
              sx={{
                width: 60,
                height: 60,
                borderRadius: '0.65rem',
                bgcolor: alpha(theme.palette.secondary.main, 0.1),
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                mb: 3,
              }}
            >
              <PhoneIcon color="secondary" sx={{ fontSize: 30 }} />
            </Box>
            <Typography variant="h5" sx={{ fontWeight: 800, mb: 1 }}>
              Phone Support
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 4, lineHeight: 1.6 }}>
              Available Mon-Sat, 9 AM to 7 PM. Speak directly with our product experts.
            </Typography>
            <Button
              variant="contained"
              fullWidth
              color="secondary"
              component="a"
              href={`tel:${supportPhone.replace(/\s/g, "")}`}
              sx={{
                py: 1.5,
                borderRadius: '0.65rem',
                fontWeight: 800,
                fontSize: "1rem",
                color: "white",
                boxShadow: `0 8px 20px ${alpha(theme.palette.secondary.main, 0.25)}`,
              }}
            >
              Call Us: {supportPhone}
            </Button>
          </Paper>
        </Grid>

        {/* FAQs and Help Resources */}
        <Grid size={{ xs: 12 }}>
          <Typography variant="h5" sx={{ fontWeight: 800, mt: 4, mb: 3, px: 1 }}>
            Popular Resources
          </Typography>
          <Grid container spacing={3}>
            {[
              { title: "Getting Started Guide", icon: <SupportIcon />, desc: "Learn the basics of Mario POS" },
              { title: "Hardware Setup", icon: <FAQIcon />, desc: "Setting up printers and scanners" },
              { title: "Reporting & Analytics", icon: <ChatIcon />, desc: "Understanding your sales data" },
            ].map((item, index) => (
              <Grid size={{ xs: 12, sm: 4 }} key={index}>
                <Paper
                  sx={{
                    p: 3,
                    borderRadius: '0.65rem',
                    display: "flex",
                    alignItems: "center",
                    gap: 2,
                    cursor: "pointer",
                    border: "1px solid transparent",
                    transition: "all 0.2s ease",
                    "&:hover": {
                      borderColor: theme.palette.primary.main,
                      bgcolor: alpha(theme.palette.primary.main, 0.02),
                      "& .chevron": { transform: "translateX(3px)" },
                    },
                  }}
                >
                  <Box sx={{ color: theme.palette.primary.main }}>{item.icon}</Box>
                  <Box sx={{ flexGrow: 1 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                      {item.title}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {item.desc}
                    </Typography>
                  </Box>
                  <ChevronRightIcon className="chevron" sx={{ color: "#94a3b8", transition: "transform 0.2s ease" }} />
                </Paper>
              </Grid>
            ))}
          </Grid>
        </Grid>

        {/* Social and Community */}
        <Grid size={{ xs: 12 }}>
          <Paper
            sx={{
              p: 4,
              mt: 4,
              borderRadius: '0.65rem',
              bgcolor: "#1e293b",
              color: "white",
              display: "flex",
              flexDirection: { xs: "column", md: "row" },
              alignItems: "center",
              justifyContent: "space-between",
              gap: 3,
            }}
          >
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 800, mb: 1 }}>
                Join our community
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.7 }}>
                Stay updated with the latest features and restaurant industry news.
              </Typography>
            </Box>
            <Stack direction="row" spacing={2}>
              {[FacebookIcon, TwitterIcon, LinkedInIcon].map((Icon, idx) => (
                <IconButton
                  key={idx}
                  sx={{
                    bgcolor: "rgba(255,255,255,0.1)",
                    color: "white",
                    "&:hover": { bgcolor: "rgba(255,255,255,0.2)" },
                  }}
                >
                  <Icon />
                </IconButton>
              ))}
            </Stack>
          </Paper>
        </Grid>
      </Grid>
      
      <Box sx={{ mt: 8, textAlign: "center", opacity: 0.5 }}>
        <Typography variant="caption" sx={{ fontWeight: 600 }}>
          &copy; {new Date().getFullYear()} Mario POS Solutions. All rights reserved.
        </Typography>
      </Box>
    </Box>
  );
}
