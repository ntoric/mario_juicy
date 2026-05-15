"use client";

import React from "react";
import {
  Box,
  Typography,
  IconButton,
  Avatar,
  Divider,
  Chip,
  Card,
  CardContent,
  Button,
  Stack,
  Paper,
  Grid,
  useTheme,
  alpha,
  keyframes,
} from "@mui/material";
import {
  ArrowBackOutlined as ArrowBackIcon,
  ImageOutlined as ImageIcon,
  TagOutlined as TagIcon,
  CategoryOutlined as CategoryIcon,
  DescriptionOutlined as DescriptionIcon,
  EditOutlined as EditIcon,
  CalendarMonthOutlined as CalendarIcon,
} from "@mui/icons-material";
import { Item } from "@/services/itemService";
import { getImageUrl } from "@/lib/getImageUrl";

const fadeIn = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`;

interface ItemDetailsProps {
  item: Item;
  onClose: () => void;
  onEdit: (item: Item) => void;
  canEdit?: boolean;
}

export default function ItemDetails({
  item,
  onClose,
  onEdit,
  canEdit = true,
}: ItemDetailsProps) {
  const theme = useTheme();

  return (
    <Box sx={{ 
      flexGrow: 1, 
      bgcolor: '#fcfcfc', 
      display: 'flex', 
      flexDirection: 'column',
      minHeight: '100%',
      animation: `${fadeIn} 0.3s ease-out`,
      position: 'relative',
      p: { xs: 2, md: 4 }
    }}>
      {/* Background Blobs */}
      <Box sx={{ position: 'absolute', top: -100, right: -100, width: 400, height: 400, background: `radial-gradient(circle, ${alpha(theme.palette.primary.main, 0.05)} 0%, transparent 70%)`, borderRadius: '50%', zIndex: 0 }} />
      
      <Box sx={{ position: 'relative', zIndex: 1, maxWidth: 1000, mx: 'auto', width: '100%' }}>
        <Box sx={{ mb: 4, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexDirection: { xs: 'column', sm: 'row' }, gap: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <IconButton 
              onClick={onClose} 
              sx={{ 
                bgcolor: 'white', 
                border: '1px solid', 
                borderColor: alpha(theme.palette.divider, 0.1), 
                borderRadius: '0.65rem',
                boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
                '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.05), color: theme.palette.primary.main }
              }}
            >
              <ArrowBackIcon />
            </IconButton>
            <Box>
              <Typography variant="h4" sx={{ fontWeight: 1000, letterSpacing: '-0.02em', color: '#1a1a1a' }}>
                Item Overview
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                Detailed technical specifications and analytics for this item.
              </Typography>
            </Box>
          </Box>
          {canEdit && (
            <Button 
              variant="contained" 
              onClick={() => onEdit(item)}
              startIcon={<EditIcon />}
              sx={{ 
                borderRadius: '0.65rem', 
                fontWeight: 1000, 
                px: 4, 
                height: 48,
                background: 'linear-gradient(135deg, #1a1a1a 0%, #333 100%)',
                boxShadow: '0 8px 20px rgba(0,0,0,0.15)',
                '&:hover': { transform: 'translateY(-2px)', boxShadow: '0 12px 30px rgba(0,0,0,0.2)' }
              }}
            >
              EDIT ITEM
            </Button>
          )}
        </Box>

        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 4 }}>
            <Card sx={{ 
              borderRadius: '0.65rem', 
              border: '1px solid', 
              borderColor: alpha(theme.palette.divider, 0.08), 
              boxShadow: '0 20px 50px rgba(0,0,0,0.04)',
              bgcolor: 'rgba(255, 255, 255, 0.8)',
              backdropFilter: 'blur(10px)',
              overflow: 'hidden',
              height: '100%'
            }}>
              <Box sx={{ height: 300, bgcolor: alpha(theme.palette.primary.main, 0.02), position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {item.image ? (
                  <img
                    src={getImageUrl(item.image)}
                    alt={item.name}
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                ) : (
                  <ImageIcon sx={{ fontSize: 80, color: alpha('#1a1a1a', 0.1) }} />
                )}
              </Box>
              <Box sx={{ p: 3 }}>
                <Typography variant="h5" sx={{ fontWeight: 1000, color: '#1a1a1a', mb: 1 }}>{item.name}</Typography>
                <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
                  <Chip
                    label={item.is_enabled ? "ACTIVE" : "DISABLED"}
                    size="small"
                    sx={{ 
                        fontWeight: 1000, 
                        height: 24,
                        fontSize: '0.65rem',
                        borderRadius: '0.65rem',
                        bgcolor: item.is_enabled ? alpha('#10b981', 0.1) : alpha('#64748b', 0.1),
                        color: item.is_enabled ? '#10b981' : '#64748b',
                    }}
                  />
                  <Chip
                    label={(item.category_name || "Uncategorized").toUpperCase()}
                    size="small"
                    sx={{ 
                        fontWeight: 1000, 
                        height: 24,
                        fontSize: '0.65rem',
                        borderRadius: '0.65rem',
                        bgcolor: alpha(theme.palette.primary.main, 0.1),
                        color: theme.palette.primary.main,
                    }}
                  />
                </Stack>
                <Typography variant="h3" sx={{ fontWeight: 1000, color: theme.palette.primary.main }}>
                  ₹{parseFloat(item.price).toFixed(0)}
                </Typography>
              </Box>
            </Card>
          </Grid>

          <Grid size={{ xs: 12, md: 8 }}>
            <Stack spacing={3} sx={{ height: '100%' }}>
              <Card sx={{ 
                p: 4, 
                borderRadius: '0.65rem', 
                border: '1px solid', 
                borderColor: alpha(theme.palette.divider, 0.08), 
                boxShadow: '0 20px 50px rgba(0,0,0,0.04)',
                bgcolor: 'rgba(255, 255, 255, 0.8)',
                backdropFilter: 'blur(10px)',
                flexGrow: 1
              }}>
                <Typography variant="overline" sx={{ fontWeight: 1000, color: theme.palette.primary.main, mb: 2, display: 'block', letterSpacing: '0.1em' }}>ITEM SPECIFICATIONS</Typography>
                
                <Stack spacing={4}>
                  <Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                      <DescriptionIcon sx={{ color: alpha('#1a1a1a', 0.4) }} fontSize="small" />
                      <Typography variant="subtitle2" sx={{ fontWeight: 1000, color: 'text.secondary' }}>Description</Typography>
                    </Box>
                    <Typography variant="body1" sx={{ fontWeight: 600, color: '#1a1a1a', lineHeight: 1.7 }}>
                      {item.description || "No description provided for this item."}
                    </Typography>
                  </Box>

                  <Grid container spacing={3}>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <Box sx={{ p: 2, bgcolor: alpha('#1a1a1a', 0.02), borderRadius: '0.65rem', border: '1px solid', borderColor: alpha(theme.palette.divider, 0.05) }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}>
                          <TagIcon sx={{ color: alpha('#1a1a1a', 0.4) }} fontSize="small" />
                          <Typography variant="caption" sx={{ fontWeight: 1000, color: 'text.disabled' }}>ITEM CODE</Typography>
                        </Box>
                        <Typography variant="h6" sx={{ fontWeight: 1000, color: '#1a1a1a' }}>{item.code || "N/A"}</Typography>
                      </Box>
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <Box sx={{ p: 2, bgcolor: alpha('#1a1a1a', 0.02), borderRadius: '0.65rem', border: '1px solid', borderColor: alpha(theme.palette.divider, 0.05) }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}>
                          <CategoryIcon sx={{ color: alpha('#1a1a1a', 0.4) }} fontSize="small" />
                          <Typography variant="caption" sx={{ fontWeight: 1000, color: 'text.disabled' }}>CATEGORY ID</Typography>
                        </Box>
                        <Typography variant="h6" sx={{ fontWeight: 1000, color: '#1a1a1a' }}>#{item.category || "0"}</Typography>
                      </Box>
                    </Grid>
                  </Grid>

                  <Box>
                    <Typography variant="overline" sx={{ fontWeight: 1000, color: theme.palette.primary.main, mb: 2, display: 'block', letterSpacing: '0.1em' }}>TIMESTAMPS & AUDIT</Typography>
                    <Grid container spacing={2}>
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
                          <Box sx={{ width: 40, height: 40, borderRadius: '0.65rem', bgcolor: alpha(theme.palette.primary.main, 0.05), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <CalendarIcon sx={{ color: theme.palette.primary.main, fontSize: 20 }} />
                          </Box>
                          <Box>
                            <Typography variant="caption" sx={{ fontWeight: 1000, color: 'text.disabled', display: 'block' }}>CREATED AT</Typography>
                            <Typography variant="body2" sx={{ fontWeight: 800 }}>{new Date(item.created_at).toLocaleDateString(undefined, { dateStyle: 'long' })}</Typography>
                          </Box>
                        </Stack>
                      </Grid>
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
                          <Box sx={{ width: 40, height: 40, borderRadius: '0.65rem', bgcolor: alpha(theme.palette.secondary.main, 0.05), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <CalendarIcon sx={{ color: theme.palette.secondary.main, fontSize: 20 }} />
                          </Box>
                          <Box>
                            <Typography variant="caption" sx={{ fontWeight: 1000, color: 'text.disabled', display: 'block' }}>LAST UPDATED</Typography>
                            <Typography variant="body2" sx={{ fontWeight: 800 }}>{new Date(item.updated_at).toLocaleDateString(undefined, { dateStyle: 'long' })}</Typography>
                          </Box>
                        </Stack>
                      </Grid>
                    </Grid>
                  </Box>
                </Stack>
              </Card>
            </Stack>
          </Grid>
        </Grid>
      </Box>
    </Box>
  );
}
