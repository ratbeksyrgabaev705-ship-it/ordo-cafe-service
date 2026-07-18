package kg.restaurant.order.controller;

import kg.restaurant.order.model.Restaurant;
import kg.restaurant.order.repository.RestaurantRepository;
import kg.restaurant.order.service.RestaurantPageService;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestParam;

@Controller
public class PageController {

    private final RestaurantRepository restaurantRepository;
    private final RestaurantPageService restaurantPageService;

    public PageController(
            RestaurantRepository restaurantRepository,
            RestaurantPageService restaurantPageService
    ) {
        this.restaurantRepository = restaurantRepository;
        this.restaurantPageService = restaurantPageService;
    }

    /** Платформа каталогу — ресторандар тандалат */
    @GetMapping("/")
    public String hub(Model model) {
        model.addAttribute("restaurants", restaurantRepository.findAll().stream()
                .filter(r -> r.getActive() == null || Boolean.TRUE.equals(r.getActive()))
                .sorted(java.util.Comparator.comparing(r -> r.getName() == null ? "" : r.getName()))
                .toList());
        return "hub";
    }

    @GetMapping("/r/{slug}")
    public String restaurantMenu(@PathVariable String slug, Model model) {
        return renderRestaurantPage(slug, model, "index");
    }

    @GetMapping("/r/{slug}/")
    public String restaurantMenuTrailingSlash(@PathVariable String slug) {
        return "redirect:/r/" + slug;
    }

    @GetMapping("/r/{slug}/cart")
    public String restaurantCart(@PathVariable String slug, Model model) {
        return renderRestaurantPage(slug, model, "cart");
    }

    @GetMapping("/r/{slug}/item")
    public String restaurantItem(@PathVariable String slug, Model model) {
        return renderRestaurantPage(slug, model, "item");
    }

    @GetMapping("/r/{slug}/receipt")
    public String restaurantReceipt(@PathVariable String slug, Model model) {
        return renderRestaurantPage(slug, model, "receipt");
    }

    /** Эски шилтемелер → Ordo */
    @GetMapping("/cart")
    public String legacyCart() {
        return "redirect:/r/ordo/cart";
    }

    @GetMapping("/item")
    public String legacyItem(@RequestParam(required = false) Long id) {
        if (id != null) {
            return "redirect:/r/ordo/item?id=" + id;
        }
        return "redirect:/r/ordo/item";
    }

    @GetMapping("/receipt")
    public String legacyReceipt() {
        return "redirect:/r/ordo/receipt";
    }

    @GetMapping("/r/{slug}/order/{orderId}")
    public String orderStatus(
            @PathVariable String slug,
            @PathVariable Long orderId,
            Model model
    ) {
        if ("femili".equalsIgnoreCase(slug)) {
            slug = "family";
        }
        Restaurant restaurant = restaurantPageService.findActiveBySlug(slug).orElse(null);
        if (restaurant == null) {
            return "redirect:/";
        }
        restaurantPageService.enrichModel(model, restaurant);
        model.addAttribute("orderId", orderId);
        return "order-status";
    }

    /** Restaurant Panel — меню, ашкана, жөндөмөлөр (Panel 3) */
    @GetMapping("/kitchen")
    public String kitchen(
            @RequestParam(required = false) String slug,
            Model model
    ) {
        resolveKitchenPanel(slug, model);
        return "kitchen";
    }

    @GetMapping("/restaurant/{slug}")
    public String restaurantPanel(@PathVariable String slug, Model model) {
        resolveKitchenPanel(slug, model);
        return "kitchen";
    }

    private void resolveKitchenPanel(String slug, Model model) {
        if (slug == null || slug.isBlank()) {
            return;
        }
        restaurantPageService.findBySlug(slug).ifPresentOrElse(
                r -> restaurantPageService.enrichModel(model, r),
                () -> restaurantPageService.enrichNotFound(model, slug)
        );
    }

    @GetMapping("/admin")
    public String admin(@RequestParam(required = false) String slug) {
        if (slug != null && !slug.isBlank()) {
            return "redirect:/kitchen?slug=" + restaurantPageService.normalizeSlug(slug);
        }
        return "redirect:/kitchen";
    }

    @GetMapping("/admin-menu")
    public String adminMenu(@RequestParam(required = false) String slug) {
        if (slug != null && !slug.isBlank()) {
            return "redirect:/kitchen?slug=" + restaurantPageService.normalizeSlug(slug) + "#menu";
        }
        return "redirect:/kitchen#menu";
    }

    @GetMapping("/owner")
    public String owner() {
        return "redirect:/ratlion";
    }

    @GetMapping("/courier")
    public String courier() {
        return "courier";
    }

    @GetMapping("/cafe")
    public String cafe(@RequestParam(required = false) String slug) {
        if (slug != null && !slug.isBlank()) {
            return "redirect:/kitchen?slug=" + restaurantPageService.normalizeSlug(slug);
        }
        return "redirect:/kitchen";
    }

    @GetMapping("/platform")
    public String platform() {
        return "redirect:/ratlion";
    }

    @GetMapping("/family")
    public String familyShortcut() {
        return "redirect:/r/family";
    }

    @GetMapping("/femili")
    public String femiliShortcut() {
        return "redirect:/r/family";
    }

    /** Ratlion Delivery Service — борбордук админ (Panel 2) */
    @GetMapping("/ratlion")
    public String ratlion() {
        return "delivery";
    }

    /** Legacy ratlion template */
    @GetMapping("/ratlion-legacy")
    public String ratlionLegacy(
            @RequestParam(required = false) String slug,
            Model model
    ) {
        if (slug != null && !slug.isBlank()) {
            if ("femili".equalsIgnoreCase(slug)) {
                slug = "family";
            }
            restaurantPageService.findActiveBySlug(slug)
                    .ifPresent(r -> restaurantPageService.enrichModel(model, r));
        }
        return "ratlion";
    }

    private String renderRestaurantPage(String slug, Model model, String template) {
        if ("femili".equalsIgnoreCase(slug)) {
            return "redirect:/r/family";
        }
        Restaurant restaurant = restaurantPageService.findBySlug(slug).orElse(null);
        if (restaurant == null) {
            return "redirect:/";
        }
        if (Boolean.FALSE.equals(restaurant.getActive())) {
            return "redirect:/";
        }
        restaurantPageService.enrichModel(model, restaurant);
        return restaurantPageService.resolveCustomerTemplate(restaurant.getSlug(), template);
    }
}
