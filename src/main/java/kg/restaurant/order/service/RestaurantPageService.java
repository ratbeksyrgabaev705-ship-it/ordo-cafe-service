package kg.restaurant.order.service;

import kg.restaurant.order.model.Restaurant;
import kg.restaurant.order.repository.RestaurantRepository;
import org.springframework.stereotype.Service;
import org.springframework.ui.Model;

import java.util.Locale;
import java.util.Optional;

@Service
public class RestaurantPageService {

    private final RestaurantRepository restaurantRepository;

    public RestaurantPageService(RestaurantRepository restaurantRepository) {
        this.restaurantRepository = restaurantRepository;
    }

    public String normalizeSlug(String slug) {
        if (slug == null) {
            return "";
        }
        String normalized = slug.trim().toLowerCase(Locale.ROOT);
        if ("femili".equals(normalized)) {
            return "family";
        }
        return normalized;
    }

    /** DBден slug боюнча табуу (активдүүлүгүнө карабастан — пanel үчүн). */
    public Optional<Restaurant> findBySlug(String slug) {
        String normalized = normalizeSlug(slug);
        if (normalized.isBlank()) {
            return Optional.empty();
        }
        return restaurantRepository.findBySlug(normalized);
    }

    public Optional<Restaurant> findActiveBySlug(String slug) {
        return findBySlug(slug)
                .filter(restaurant -> restaurant.getActive() == null
                        || Boolean.TRUE.equals(restaurant.getActive()));
    }

    public void enrichModel(Model model, Restaurant restaurant) {
        model.addAttribute("restaurantId", restaurant.getId());
        model.addAttribute("restaurantSlug", restaurant.getSlug());
        model.addAttribute("restaurantName", restaurant.getName());
        model.addAttribute("restaurantEmoji", restaurant.getEmoji());
        model.addAttribute("restaurantColor", restaurant.getAccentColor());
        model.addAttribute("restaurantTagline", restaurant.getTagline());
        model.addAttribute("restaurantLogo", restaurant.getLogoUrl());
        model.addAttribute("restaurantBanner", restaurant.getBannerUrl());
        model.addAttribute("restaurantBase", "/r/" + restaurant.getSlug());
        model.addAttribute("customerTheme", resolveCustomerTheme(restaurant.getSlug()));
        model.addAttribute("restaurantNotFound", false);
    }

    public void enrichNotFound(Model model, String slug) {
        model.addAttribute("restaurantNotFound", true);
        model.addAttribute("requestedSlug", normalizeSlug(slug));
    }

    public boolean usesFamilyTheme(String slug) {
        return "family".equals(normalizeSlug(slug));
    }

    public String resolveCustomerTemplate(String slug, String defaultTemplate) {
        if (usesFamilyTheme(slug)) {
            return "family-" + defaultTemplate;
        }
        return defaultTemplate;
    }

    private String resolveCustomerTheme(String slug) {
        return usesFamilyTheme(slug) ? "family" : "ordo";
    }

    public String publicPath(Restaurant restaurant) {
        return "/r/" + restaurant.getSlug();
    }
}
