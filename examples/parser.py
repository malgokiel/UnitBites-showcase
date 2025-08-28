def parse(raw_ingredients):
    """
    Takes a string of ingredients, converts it to a list of items.
    Parses each item to a dictionary:
    {
    'amount_min': amount_min, 
    'amount_max': amount_max, 
    'unit': unit, 
    'item': item
    }
    Returns a list of dictionaries.
    """
    ingredients = standardise_fractions(raw_ingredients)

    parsed_ingredients = []
    list_of_ingredients = ingredients.split('\n')

    for ingredient in list_of_ingredients:
        ingredient = ingredient.strip()
        ingredient = re.sub(r"^[▢\-\*\s]+", "", ingredient)

        # Checks line against GENERAL_SUBAMOUNT_REGEX first for patterns like "2 28-oz cans"
        fallback = fallback_parse_general_subamount(ingredient)

        if fallback:
            parsed_ingredients.append(fallback)
        else:
            match = INGREDIENT_REGEX.match(ingredient)
            if match:
                leading_word_amount_str = match.group('leading_word_amount')
                amount1_raw = match.group('amount1_raw')
                amount2_raw = match.group('amount2_raw')
                rest_of_line = match.group('rest')

                # Calculate multiplier from leading word amount if present
                multiplier = find_multiplier(leading_word_amount_str)

                # Turns amounts to floats and applies multipliers when required
                amount_min, amount_max = calculate_amounts(multiplier, amount1_raw, amount2_raw)

                unit, item = extract_unit_item(rest_of_line)
                unit = normalize_unit(unit) if unit else None

                # Additional check for units that might have been part of the item for "1-2 jalapeños"
                if unit is None and item and re.match(r'^\d+(\.\d+)?', item):
                    pass
                parsed_ingredients.append({'amount_min': amount_min, 
                                           'amount_max': amount_max, 
                                           'unit': unit, 
                                           'item': item})

    return parsed_ingredients
