import { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { getProxiedImageUrl, isInstagramImage, fetchImageAsBlob } from '../utils/imageProxy';
import { getCachedAvatar, cacheAvatar, loadAvatarWithQueue } from '../utils/avatarCache';

export default function BubbleChart({ data, onBubbleClick, width, height }) {
  const svgRef = useRef(null);
  const simulationRef = useRef(null);

  useEffect(() => {
    const svg = d3.select(svgRef.current);
    
    // Keep defs if they exist, otherwise create them
    let defs = svg.select('defs');
    if (defs.empty()) {
      defs = svg.append('defs');
    }
    
    if (!data || data.length === 0) {
      // If no data, remove all bubbles with exit animation
      svg.selectAll('g.bubble')
        .transition()
        .duration(500)
        .attr('transform', d => `translate(${d.x || 0},${d.y || 0}) scale(0)`)
        .style('opacity', 0)
        .remove();
      if (simulationRef.current) {
        simulationRef.current.stop();
      }
      return;
    }

    // Calculate bubble size based on total followers
    const maxFollowers = d3.max(data, d => d.total_followers);
    const minFollowers = d3.min(data, d => d.total_followers);
    const sizeScale = d3.scaleSqrt()
      .domain([minFollowers, maxFollowers])
      .range([20, 200]);

    // Load saved positions from localStorage
    const savedPositions = JSON.parse(localStorage.getItem('bubblePositions') || '{}');
    
    // Get existing nodes from simulation if it exists
    const existingNodes = simulationRef.current ? simulationRef.current.nodes() : [];
    const existingNodesMap = new Map(existingNodes.map(n => [n.id, n]));
    
    // Get existing bubbles from DOM to check which ones already exist
    const existingBubbles = svg.selectAll('g.bubble').data();
    const existingBubbleIds = new Set(existingBubbles.map(b => b.id));
    
    // Create nodes for force simulation
    const nodes = data.map(d => {
      const savedPos = savedPositions[d.id];
      const existingNode = existingNodesMap.get(d.id);
      const isNewBubble = !existingBubbleIds.has(d.id);
      
      // If node exists in simulation, keep its position and velocity
      // If it's a new bubble, spawn randomly but don't force it
      return {
        ...d,
        radius: sizeScale(d.total_followers),
        x: existingNode?.x ?? savedPos?.x ?? (Math.random() * width),
        y: existingNode?.y ?? savedPos?.y ?? (Math.random() * height),
        fx: savedPos?.fx ?? null,
        fy: savedPos?.fy ?? null,
        vx: existingNode?.vx ?? 0, // No initial velocity, let physics handle it naturally
        vy: existingNode?.vy ?? 0
      };
    });

    // Create or update force simulation - no center force, bubbles float freely
    let simulation = simulationRef.current;
    
    if (simulation) {
      // Update existing simulation with new nodes
      simulation.nodes(nodes);
      // Restart simulation with low alpha to avoid sudden movements
      simulation.alpha(0.1).restart();
    } else {
      // Create new simulation only if it doesn't exist
      simulation = d3.forceSimulation(nodes)
        .force('charge', d3.forceManyBody().strength(-120)) // Reduced strength for smoother movement
        .force('collision', d3.forceCollide().radius(d => d.radius + 5)) // Increased padding to reduce constant collisions
        .velocityDecay(0.6) // Increased from 0.4 to 0.6 for slower movement (higher = slower)
        .alphaDecay(0.005); // Reduced from 0.01 to 0.005 for much slower movement
      
      simulationRef.current = simulation;
    }

    // Track if user is dragging to prevent click events
    let isDragging = false;

    // Create drag behavior
    const drag = d3.drag()
      .on('start', (event, d) => {
        isDragging = false;
        if (!event.active) simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
        svg.style('cursor', 'grabbing');
      })
      .on('drag', (event, d) => {
        isDragging = true;
        d.fx = event.x;
        d.fy = event.y;
      })
      .on('end', (event, d) => {
        if (!event.active) simulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;
        svg.style('cursor', 'default');
        // Save position after drag
        saveBubblePositions(nodes);
        // Reset dragging flag after a short delay
        setTimeout(() => {
          isDragging = false;
        }, 100);
      });

    // Create bubbles with enter/update/exit pattern
    const bubbles = svg.selectAll('g.bubble')
      .data(nodes, d => d.id); // Use id as key for proper matching
    
    // Exit: Remove bubbles that are no longer in data (not in current view)
    const bubblesExit = bubbles.exit();
    bubblesExit
      .transition()
      .duration(500)
      .ease(d3.easeBackIn)
      .attr('transform', d => `translate(${d.x || 0},${d.y || 0}) scale(0)`)
      .style('opacity', 0)
      .remove();
    
    // Update: Existing bubbles that are already in DOM - update size and animate scale
    const bubblesUpdate = bubbles;
    
    // Update radius for existing bubbles (size may have changed due to filter)
    bubblesUpdate.each(function(d) {
      const node = nodes.find(n => n.id === d.id);
      if (node) {
        const bubbleGroup = d3.select(this);
        const circle = bubbleGroup.select('circle');
        
        // Only animate if radius changed
        if (circle.attr('r') != node.radius) {
          // Update radius with animation
          circle
            .transition()
            .duration(600)
            .ease(d3.easeBackOut.overshoot(1.5))
            .attr('r', node.radius);
          
          // Update gradients if color changed
          if (node.color !== d.color) {
            // Recreate gradients for this node
            const borderGradientId = `borderGradient-${node.id}`;
            const fillGradientId = `fillGradient-${node.id}`;
            
            // Remove old gradients if they exist
            defs.select(`#${borderGradientId}`).remove();
            defs.select(`#${fillGradientId}`).remove();
            
            // Create new gradients
            const borderGradient = defs.append('linearGradient')
              .attr('id', borderGradientId)
              .attr('x1', '0%')
              .attr('y1', '0%')
              .attr('x2', '100%')
              .attr('y2', '100%');
            
            const color1 = node.color;
            const color2 = d3.rgb(node.color).brighter(0.5).toString();
            const color3 = d3.rgb(node.color).darker(0.3).toString();
            
            borderGradient.append('stop')
              .attr('offset', '0%')
              .attr('stop-color', color2)
              .attr('stop-opacity', 1);
            borderGradient.append('stop')
              .attr('offset', '50%')
              .attr('stop-color', color1)
              .attr('stop-opacity', 1);
            borderGradient.append('stop')
              .attr('offset', '100%')
              .attr('stop-color', color3)
              .attr('stop-opacity', 1);
            
            const fillGradient = defs.append('radialGradient')
              .attr('id', fillGradientId)
              .attr('cx', '50%')
              .attr('cy', '50%')
              .attr('r', '100%');
            
            fillGradient.append('stop')
              .attr('offset', '0%')
              .attr('stop-color', color1)
              .attr('stop-opacity', 0);
            fillGradient.append('stop')
              .attr('offset', '40%')
              .attr('stop-color', color1)
              .attr('stop-opacity', 0.1);
            fillGradient.append('stop')
              .attr('offset', '70%')
              .attr('stop-color', color1)
              .attr('stop-opacity', 0.25);
            fillGradient.append('stop')
              .attr('offset', '90%')
              .attr('stop-color', color1)
              .attr('stop-opacity', 0.4);
            fillGradient.append('stop')
              .attr('offset', '100%')
              .attr('stop-color', color1)
              .attr('stop-opacity', 0.5);
            
            // Update circle gradients
            circle
              .attr('fill', `url(#${fillGradientId})`)
              .attr('stroke', `url(#${borderGradientId})`);
          }
          
          // Update avatar size and position if radius changed
          const newAvatarSize = node.radius * 0.5;
          const newAvatarY = -node.radius * 0.35;
          
          // Update avatar background circle
          const avatarBg = bubbleGroup.select('circle.avatar-bg');
          if (avatarBg.size() > 0) {
            avatarBg
              .transition()
              .duration(600)
              .ease(d3.easeBackOut.overshoot(1.5))
              .attr('r', newAvatarSize)
              .attr('cy', newAvatarY)
              .style('opacity', node.radius > 35 ? 1 : 0);
          }
          
          // Update avatar clip path
          const clipId = `avatar-clip-${node.id}`;
          const clipPath = defs.select(`#${clipId} circle`);
          if (clipPath.size() > 0) {
            clipPath
              .attr('r', newAvatarSize)
              .attr('cy', newAvatarY);
          }
          
          // Update avatar image
          const avatarImage = bubbleGroup.select('image.avatar-image');
          if (avatarImage.size() > 0) {
            avatarImage
              .transition()
              .duration(600)
              .ease(d3.easeBackOut.overshoot(1.5))
              .attr('x', -newAvatarSize)
              .attr('y', newAvatarY - newAvatarSize)
              .attr('width', newAvatarSize * 2)
              .attr('height', newAvatarSize * 2)
              .style('opacity', node.radius > 35 ? 1 : 0);
          }
          
          // Update avatar initials text
          const avatarInitials = bubbleGroup.select('text.avatar-initials');
          if (avatarInitials.size() > 0) {
            avatarInitials
              .transition()
              .duration(600)
              .ease(d3.easeBackOut.overshoot(1.5))
              .attr('y', newAvatarY)
              .attr('font-size', newAvatarSize * 0.6)
              .style('opacity', node.radius > 35 ? 1 : 0);
          }
          
          // Update loading spinner
          const spinner = bubbleGroup.select('circle.avatar-spinner');
          if (spinner.size() > 0) {
            const spinnerRadius = newAvatarSize * 0.3;
            spinner
              .transition()
              .duration(600)
              .ease(d3.easeBackOut.overshoot(1.5))
              .attr('r', spinnerRadius)
              .attr('cy', newAvatarY)
              .attr('stroke-dasharray', `${Math.PI * spinnerRadius * 0.5} ${Math.PI * spinnerRadius * 0.5}`)
              .style('opacity', node.radius > 35 ? 0.7 : 0);
          }
          
          // Update text sizes if radius changed (use class selectors to avoid duplicates)
          const nameText = bubbleGroup.select('text.kol-name');
          const followerText = bubbleGroup.select('text.follower-count');
          
          if (nameText.size() > 0) {
            nameText
              .transition()
              .duration(600)
              .ease(d3.easeBackOut.overshoot(1.5))
              .attr('font-size', Math.max(18, Math.min(28, node.radius / 2.5)))
              .style('opacity', node.radius > 35 ? 1 : 0)
              .text(() => {
                // Truncate long names
                const maxLength = Math.floor(node.radius / 4);
                if (node.name.length > maxLength) {
                  return node.name.substring(0, maxLength - 2) + '..';
                }
                return node.name;
              });
          }
          
          if (followerText.size() > 0) {
            const total = node.total_followers;
            const followerTextValue = total >= 1000000 
              ? `${(total / 1000000).toFixed(1)}M`
              : total >= 1000 
                ? `${(total / 1000).toFixed(0)}K`
                : total.toString();
            
            followerText
              .transition()
              .duration(600)
              .ease(d3.easeBackOut.overshoot(1.5))
              .attr('font-size', Math.max(13, Math.min(18, node.radius / 4)))
              .attr('dy', node.radius * 0.4 + 14)
              .style('opacity', node.radius > 35 ? 1 : 0)
              .text(followerTextValue);
          }
        }
      }
    });
    
    // Enter: Add new bubbles with scale animation (only bubbles that don't exist yet)
    const bubblesEnter = bubbles.enter()
      .append('g')
      .attr('class', 'bubble')
      .attr('transform', d => `translate(${d.x || 0},${d.y || 0}) scale(0)`)
      .style('cursor', 'grab')
      .style('opacity', 0)
      .call(drag);
    
    // Animate new bubbles appearing (scale from 0 to 1) - only for truly new bubbles
    bubblesEnter
      .transition()
      .duration(600)
      .ease(d3.easeBackOut.overshoot(1.5))
      .attr('transform', d => `translate(${d.x || 0},${d.y || 0}) scale(1)`)
      .style('opacity', 1);
    
    // Merge enter and update selections
    const bubblesMerged = bubblesEnter.merge(bubbles);
    
    // Create filter for glow effect (only if it doesn't exist)
    let glowFilter = defs.select('#glow');
    if (glowFilter.empty()) {
      glowFilter = defs.append('filter')
        .attr('id', 'glow')
        .attr('x', '-50%')
        .attr('y', '-50%')
        .attr('width', '200%')
        .attr('height', '200%');
      
      glowFilter.append('feGaussianBlur')
        .attr('stdDeviation', '3')
        .attr('result', 'coloredBlur');
      
      const feMerge = glowFilter.append('feMerge');
      feMerge.append('feMergeNode').attr('in', 'coloredBlur');
      feMerge.append('feMergeNode').attr('in', 'SourceGraphic');
    }
    
    // Create gradients for each node (only for new bubbles, use id for consistency)
    nodes.forEach((d) => {
      // Check if gradient already exists (for existing bubbles)
      if (defs.select(`#borderGradient-${d.id}`).empty()) {
        // Create linear gradient for border
        const borderGradient = defs.append('linearGradient')
          .attr('id', `borderGradient-${d.id}`)
          .attr('x1', '0%')
          .attr('y1', '0%')
          .attr('x2', '100%')
          .attr('y2', '100%');
        
        // Create color variations for gradient
        const color1 = d.color;
        const color2 = d3.rgb(d.color).brighter(0.5).toString();
        const color3 = d3.rgb(d.color).darker(0.3).toString();
        
        borderGradient.append('stop')
          .attr('offset', '0%')
          .attr('stop-color', color2)
          .attr('stop-opacity', 1);
        
        borderGradient.append('stop')
          .attr('offset', '50%')
          .attr('stop-color', color1)
          .attr('stop-opacity', 1);
        
        borderGradient.append('stop')
          .attr('offset', '100%')
          .attr('stop-color', color3)
          .attr('stop-opacity', 1);
      }

      // Check if fill gradient already exists
      if (defs.select(`#fillGradient-${d.id}`).empty()) {
        // Create radial gradient for fill (transparent center to more opaque at border)
        const fillGradient = defs.append('radialGradient')
          .attr('id', `fillGradient-${d.id}`)
          .attr('cx', '50%')
          .attr('cy', '50%')
          .attr('r', '100%');
        
        const color1 = d.color;
        
        // Gradient from transparent center to more opaque at edges
        fillGradient.append('stop')
          .attr('offset', '0%')
          .attr('stop-color', color1)
          .attr('stop-opacity', 0);
        
        fillGradient.append('stop')
          .attr('offset', '40%')
          .attr('stop-color', color1)
          .attr('stop-opacity', 0.1);
        
        fillGradient.append('stop')
          .attr('offset', '70%')
          .attr('stop-color', color1)
          .attr('stop-opacity', 0.25);
        
        fillGradient.append('stop')
          .attr('offset', '90%')
          .attr('stop-color', color1)
          .attr('stop-opacity', 0.4);
        
        fillGradient.append('stop')
          .attr('offset', '100%')
          .attr('stop-color', color1)
          .attr('stop-opacity', 0.5);
      }
    });

    // Add circles with radial gradient fill and gradient border (only for new bubbles)
    bubblesEnter.append('circle')
      .attr('r', d => d.radius)
      .attr('fill', d => `url(#fillGradient-${d.id})`)
      .attr('stroke', d => `url(#borderGradient-${d.id})`)
      .attr('stroke-width', 4)
      .attr('stroke-linecap', 'round')
      .style('filter', 'url(#glow)')
      .on('mouseenter', function(event, d) {
        d3.select(this)
          .transition()
          .duration(200)
          .attr('stroke-width', 6)
          .style('filter', 'url(#glow) drop-shadow(0 0 8px ' + d.color + ')');
      })
      .on('mouseleave', function(event, d) {
        d3.select(this)
          .transition()
          .duration(200)
          .attr('stroke-width', 4)
          .style('filter', 'url(#glow)');
      })
      .on('click', (event, d) => {
        // Only trigger click if not dragging
        if (!isDragging && onBubbleClick) {
          onBubbleClick(d);
        }
      });

    // Add content inside bubble: avatar/logo at top, name in middle, follower count at bottom (only for new bubbles)
    bubblesEnter.each(function(d) {
      const bubbleGroup = d3.select(this);
      const avatarSize = d.radius * 0.5; // Avatar circle size
      const avatarY = -d.radius * 0.35; // Position at top, centered vertically
      
      // Add small white circle background for avatar/logo at top
      const avatarBg = bubbleGroup.append('circle')
        .attr('class', 'avatar-bg')
        .attr('cx', 0)
        .attr('cy', avatarY)
        .attr('r', avatarSize)
        .attr('fill', '#ffffff')
        .style('pointer-events', 'none');
      
      // Add avatar image or initials in the small circle at top
      if (d.avatar_url) {
        // Add clip path for circular avatar
        const clipId = `avatar-clip-${d.id}`;
        defs.append('clipPath')
          .attr('id', clipId)
          .append('circle')
          .attr('cx', 0)
          .attr('cy', avatarY)
          .attr('r', avatarSize);
        
        // Add loading spinner while avatar is loading
        const loadingSpinner = bubbleGroup.append('g')
          .attr('class', 'avatar-loading')
          .style('opacity', 1);
        
        // Create spinning circle for loading indicator
        const spinnerRadius = avatarSize * 0.3;
        const spinnerCircle = loadingSpinner.append('circle')
          .attr('class', 'avatar-spinner')
          .attr('cx', 0)
          .attr('cy', avatarY)
          .attr('r', spinnerRadius)
          .attr('fill', 'none')
          .attr('stroke', '#5865F2')
          .attr('stroke-width', 3)
          .attr('stroke-dasharray', `${Math.PI * spinnerRadius * 0.5} ${Math.PI * spinnerRadius * 0.5}`)
          .attr('stroke-dashoffset', 0)
          .style('opacity', 0.7);
        
        // Store spinner reference for cleanup
        let spinnerAnimation = null;
        
        // Function to start spinner animation (slow rotation)
        const startSpinner = () => {
          const circumference = Math.PI * spinnerRadius;
          let offset = 0;
          let lastTime = performance.now();
          const animate = (currentTime) => {
            const deltaTime = currentTime - lastTime;
            // Rotate slowly: only update every ~100ms and move less per frame
            if (deltaTime >= 100) {
              offset = (offset + 1.5) % (circumference * 2); // Very slow rotation
              spinnerCircle.attr('stroke-dashoffset', offset);
              lastTime = currentTime;
            }
            spinnerAnimation = requestAnimationFrame(animate);
          };
          spinnerAnimation = requestAnimationFrame(animate);
        };
        
        // Function to stop spinner animation
        const stopSpinner = () => {
          if (spinnerAnimation) {
            cancelAnimationFrame(spinnerAnimation);
            spinnerAnimation = null;
          }
        };
        
        // Start spinner immediately
        startSpinner();
        
        // Create image element but don't set href yet to avoid CORS errors
        const imageElement = bubbleGroup.append('image')
          .attr('class', 'avatar-image')
          .attr('x', -avatarSize)
          .attr('y', avatarY - avatarSize)
          .attr('width', avatarSize * 2)
          .attr('height', avatarSize * 2)
          .attr('clip-path', `url(#${clipId})`)
          .style('pointer-events', 'none')
          .style('opacity', 0);
        
        // Function to hide loading spinner and show image
        const hideLoadingAndShowImage = () => {
          stopSpinner();
          loadingSpinner.transition().duration(200).style('opacity', 0).remove();
          imageElement.transition().duration(300).style('opacity', 1);
        };
        
        // Function to hide loading spinner and show initials
        const hideLoadingAndShowInitials = () => {
          stopSpinner();
          loadingSpinner.transition().duration(200).style('opacity', 0).remove();
          addInitialsInCircle(bubbleGroup, d, avatarY, avatarSize);
        };
        
        // Check cache first
        const cachedBlobUrl = getCachedAvatar(d.avatar_url);
        if (cachedBlobUrl) {
          // Use cached avatar
          imageElement.attr('href', cachedBlobUrl);
          const img = new Image();
          img.onload = () => {
            hideLoadingAndShowImage();
          };
          img.onerror = () => {
            imageElement.remove();
            hideLoadingAndShowInitials();
          };
          img.src = cachedBlobUrl;
        } else {
          // Load avatar through queue (max 3 parallel)
          let loadFn;
          
          if (isInstagramImage(d.avatar_url)) {
            // Instagram image: fetch through proxy
            loadFn = () => fetchImageAsBlob(d.avatar_url);
          } else {
            // Non-Instagram image: try direct load with CORS
            loadFn = () => {
              return new Promise((resolve, reject) => {
                const img = new Image();
                img.crossOrigin = 'anonymous';
                img.onload = () => {
                  // For direct images, return the original URL (cache it as itself)
                  resolve(d.avatar_url);
                };
                img.onerror = () => {
                  reject(new Error('Failed to load image'));
                };
                img.src = d.avatar_url;
              });
            };
          }

          // Load through queue
          loadAvatarWithQueue(d.avatar_url, loadFn)
            .then(resultUrl => {
              if (resultUrl) {
                // Update image source (could be blob URL or original URL)
                imageElement.attr('href', resultUrl);
                
                // Preload to verify it works
                const img = new Image();
                img.onload = () => {
                  hideLoadingAndShowImage();
                };
                img.onerror = () => {
                  // If it's a blob URL, revoke it
                  if (resultUrl.startsWith('blob:')) {
                    URL.revokeObjectURL(resultUrl);
                  }
                  imageElement.remove();
                  hideLoadingAndShowInitials();
                };
                img.src = resultUrl;
              } else {
                // Failed to load, fallback to initials
                imageElement.remove();
                hideLoadingAndShowInitials();
              }
            })
            .catch((error) => {
              console.warn(`Failed to load avatar for ${d.name}:`, error);
              imageElement.remove();
              hideLoadingAndShowInitials();
            });
        }
      } else {
        // Fallback to initials if no avatar
        addInitialsInCircle(bubbleGroup, d, avatarY, avatarSize);
      }
    });

    // Helper function to add initials in the small circle at top
    function addInitialsInCircle(bubbleGroup, d, y, size) {
      bubbleGroup.append('text')
        .attr('class', 'avatar-initials')
        .attr('text-anchor', 'middle')
        .attr('x', 0)
        .attr('y', y)
        .attr('dy', '0.35em')
        .attr('fill', '#2f3136')
        .attr('font-size', size * 0.6)
        .attr('font-weight', '700')
        .style('pointer-events', 'none')
        .style('user-select', 'none')
        .text(d => d.initials || d.name.substring(0, 2).toUpperCase());
    }

    // Add KOL name in the middle (largest text) - only show if bubble is large enough (only for new bubbles)
    bubblesEnter.append('text')
      .attr('class', 'kol-name')
      .attr('text-anchor', 'middle')
      .attr('x', 0)
      .attr('y', 0)
      .attr('dy', '0.35em')
      .attr('fill', '#ffffff')
      .attr('font-size', d => Math.max(18, Math.min(28, d.radius / 2.5)))
      .attr('font-weight', '700')
      .style('pointer-events', 'none')
      .style('user-select', 'none')
      .style('text-shadow', '0 1px 3px rgba(0, 0, 0, 0.7)')
      .style('opacity', d => d.radius > 35 ? 1 : 0) // Hide text if bubble too small
      .text(d => {
        // Truncate long names
        const maxLength = Math.floor(d.radius / 4);
        if (d.name.length > maxLength) {
          return d.name.substring(0, maxLength - 2) + '..';
        }
        return d.name;
      });

    // Add follower count at bottom - only show if bubble is large enough (only for new bubbles)
    bubblesEnter.append('text')
      .attr('class', 'follower-count')
      .attr('text-anchor', 'middle')
      .attr('x', 0)
      .attr('y', 0)
      .attr('dy', d => d.radius * 0.4 + 14)
      .attr('fill', '#b9bbbe')
      .attr('font-size', d => Math.max(13, Math.min(18, d.radius / 4))) // Increased from /5 to /4, min from 11 to 13, max from 15 to 18
      .attr('font-weight', '700') // Changed from '500' to '700' (bold)
      .style('pointer-events', 'none')
      .style('user-select', 'none')
      .style('text-shadow', '0 1px 2px rgba(0, 0, 0, 0.5)')
      .style('opacity', d => d.radius > 35 ? 1 : 0) // Hide text if bubble too small
      .text(d => {
        const total = d.total_followers;
        if (total >= 1000000) {
          return `${(total / 1000000).toFixed(1)}M`;
        } else if (total >= 1000) {
          return `${(total / 1000).toFixed(0)}K`;
        }
        return total.toString();
      });

    // Save positions function
    const saveBubblePositions = (nodes) => {
      const positions = {};
      nodes.forEach(node => {
        positions[node.id] = {
          x: node.x,
          y: node.y,
          fx: node.fx,
          fy: node.fy
        };
      });
      localStorage.setItem('bubblePositions', JSON.stringify(positions));
    };

    // Throttle position saving
    let saveTimeout = null;
    const throttledSave = () => {
      if (saveTimeout) return;
      saveTimeout = setTimeout(() => {
        saveBubblePositions(nodes);
        saveTimeout = null;
      }, 1000); // Save every 1 second
    };

    // Update positions on simulation tick
    simulation.on('tick', () => {
      // Apply boundary constraints to keep bubbles within viewport
      nodes.forEach(node => {
        // Keep bubbles within bounds (accounting for radius)
        const padding = node.radius + 5;
        if (node.x < padding) {
          node.x = padding;
          node.vx = 0;
        } else if (node.x > width - padding) {
          node.x = width - padding;
          node.vx = 0;
        }
        if (node.y < padding) {
          node.y = padding;
          node.vy = 0;
        } else if (node.y > height - padding) {
          node.y = height - padding;
          node.vy = 0;
        }
      });
      
      // Update positions for all bubbles (get fresh selection from DOM and match with nodes)
      svg.selectAll('g.bubble')
        .data(nodes, d => d.id)
        .attr('transform', d => `translate(${d.x},${d.y})`);
      // Throttled save of positions
      throttledSave();
    });

    // Cleanup
    return () => {
      if (simulationRef.current) {
        simulationRef.current.stop();
      }
    };
  }, [data, width, height, onBubbleClick]);

  return (
    <svg
      ref={svgRef}
      width={width}
      height={height}
      style={{ display: 'block' }}
    />
  );
}

