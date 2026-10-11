<?php
/**
 * Plugin Name: Comarketer SEO fields
 * Description: Lets Comarketer set the SEO title, meta description and focus keyword (Yoast SEO or Rank Math) when it sends a post. Only users who can edit the post can change them.
 * Version: 1.0.0
 *
 * Install: upload this file to wp-content/mu-plugins/ (or zip it and add it under Plugins → Add New → Upload).
 */
add_action('init', function () {
    $keys = [
        '_yoast_wpseo_title', '_yoast_wpseo_metadesc', '_yoast_wpseo_focuskw',
        'rank_math_title', 'rank_math_description', 'rank_math_focus_keyword',
    ];
    foreach ($keys as $key) {
        register_post_meta('post', $key, [
            'type'              => 'string',
            'single'            => true,
            'show_in_rest'      => true,
            'sanitize_callback' => 'sanitize_text_field',
            'auth_callback'     => function ($allowed, $meta_key, $post_id) {
                return current_user_can('edit_post', $post_id);
            },
        ]);
    }
});
